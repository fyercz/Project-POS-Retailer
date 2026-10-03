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
    prepareStoreForLaunch,
    setIsSyncModalOpen,
    autoSyncEnabled,
    autoSyncIntervalSeconds,
    databaseEngine,
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
    } catch (err: any) {
      setTestStatus('Gagal tes cetak: ' + (err.message || String(err)));
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
    } catch (err: any) {
      setTestStatus('Gagal tes buka laci: ' + (err.message || String(err)));
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
    updateSettings(sanitizedSettings);
    savePrinterConfig(printerConfig);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleExecuteLaunch = () => {
    try {
      const res = prepareStoreForLaunch({
        resetTransactions: cleanTxOption,
        resetProductsToBlank: productCatalogChoice === 'blank_catalog',
      });
      if (res.success) {
        setLaunchSuccessMessage(
          `Selamat! Data demo dan pengujian berhasil dibersihkan. Toko "${formData.storeName || 'Retail POS'}" kini 100% SIAP DILUNCURKAN (Ready to Launch) untuk melayani pelanggan pertama!`
        );
        setIsConfirmingLaunch(false);
      } else {
        setLaunchErrorMessage(res.message);
      }
    } catch (err: any) {
      setLaunchErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyiapkan toko.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="settings-dialog"
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              POS Terminal &amp; Store Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950 px-3 pt-2 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 rounded-t-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-t border-x border-slate-200 dark:border-slate-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Pengaturan Toko &amp; Struk</span>
          </button>
          <button
            type="button"
            id="tab-btn-launch-readiness"
            onClick={() => setActiveTab('launch')}
            className={`px-3 py-2 rounded-t-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'launch'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-t border-x border-slate-200 dark:border-slate-800 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-emerald-500" />
            <span>Kesiapan Peluncuran (Ready to Launch)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>
        </div>

        {activeTab === 'settings' && (
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Logo & Brand Identity */}
          <div className="space-y-3 bg-gradient-to-br from-sky-50/70 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-4 rounded-2xl border border-sky-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-sm">
                <Store className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Logo &amp; Identitas Toko (ULIL Mart)</span>
              </div>
              <a
                href="/ulilmart-logo.svg"
                download="ulilmart-logo.svg"
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                title="Unduh file master logo SVG"
              >
                <Download className="w-3 h-3 text-sky-500" />
                <span>Unduh SVG</span>
              </a>
            </div>

            {/* Logo Live Visualizer Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col items-center justify-center min-h-[90px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tampilan Mode Terang</span>
                <UlilMartLogo variant="full" height={48} className="max-w-[210px] drop-shadow-xs" />
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-2xs flex flex-col items-center justify-center min-h-[90px]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tampilan Mode Gelap</span>
                <UlilMartLogo variant="full" height={48} theme="dark" className="max-w-[210px] drop-shadow-xs" />
              </div>
            </div>

            {/* Tagline & Receipt Logo Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Slogan / Tagline Toko
                </label>
                <input
                  type="text"
                  value={formData.storeTagline || ''}
                  placeholder="Lengkap &amp; Hemat"
                  onChange={(e) => setFormData({ ...formData, storeTagline: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 cursor-pointer w-full hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.showLogoOnReceipt !== false}
                    onChange={(e) => setFormData({ ...formData, showLogoOnReceipt: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Cetak Logo di Struk</div>
                    <div className="text-[10px] text-slate-500">Tampilkan logo ULIL Mart di kop struk kasir</div>
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
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    storeName: 'ULIL Mart',
                    storeTagline: 'Lengkap & Hemat',
                    branchName: 'Cabang Parang, Magetan',
                    address: 'Jaten, Krajan, Kec. Parang, Kabupaten Magetan, Jawa Timur 63371',
                    phone: '0851-7671-9187',
                    googleMapsUrl: 'https://maps.app.goo.gl/vdPYeh4Ncp7Hotzg8',
                    operatingHours: '06.00 – 21.00 WIB (Buka Setiap Hari)',
                  });
                }}
                className="px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Isi otomatis data dari lokasi Google Maps ULILMART"
              >
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Muat dari Google Maps</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Nama Toko / Brand
                </label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Nama Cabang / Unit
                </label>
                <input
                  type="text"
                  required
                  value={formData.branchName}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Alamat Fisik Toko
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Nomor Telepon / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Jam Operasional
                </label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.operatingHours || ''}
                    placeholder="06.00 – 21.00 WIB (Buka Setiap Hari)"
                    onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                    className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
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
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-500 dark:text-sky-400 flex items-center gap-1"
                  >
                    <span>Buka di Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-rose-500" />
                <input
                  type="url"
                  value={formData.googleMapsUrl || ''}
                  placeholder="https://maps.app.goo.gl/..."
                  onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                  className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
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
                <div className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 font-bold text-xs flex items-center justify-between">
                  <span>IDR (Rp) - Rupiah</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Baku
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Min Margin Poin (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={formData.minProfitPercentForPoints ?? 15}
                  onChange={(e) => setFormData({ ...formData, minProfitPercentForPoints: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="15"
                />
                <span className="text-[10px] text-slate-400">Min. profit barang dapat poin</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Rasio Perolehan Poin (Rp)
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={formData.pointsRatio ?? 10000}
                  onChange={(e) => setFormData({ ...formData, pointsRatio: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="10000"
                />
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {[1000, 5000, 10000, 20000].map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setFormData({ ...formData, pointsRatio: pr })}
                      className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition cursor-pointer ${
                        formData.pointsRatio === pr
                          ? 'bg-emerald-600 text-white font-bold border-emerald-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400'
                      }`}
                    >
                      {pr.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">1 poin per kelipatan belanja</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Nilai Diskon Poin (Rp/Poin)
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={formData.pointRedemptionRate ?? 100}
                  onChange={(e) => setFormData({ ...formData, pointRedemptionRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="100"
                />
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {[10, 50, 100, 200, 500, 1000].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setFormData({ ...formData, pointRedemptionRate: rate })}
                      className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition cursor-pointer ${
                        formData.pointRedemptionRate === rate
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                      }`}
                    >
                      {rate}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">Nilai diskon per 1 poin (cth: Rp 10 atau Rp 100)</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Min. Poin Ditukar
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={formData.minRedeemPoints ?? 10}
                  onChange={(e) => setFormData({ ...formData, minRedeemPoints: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="10"
                />
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {[1, 5, 10, 20, 50, 100].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setFormData({ ...formData, minRedeemPoints: pts })}
                      className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition cursor-pointer ${
                        formData.minRedeemPoints === pts
                          ? 'bg-purple-600 text-white font-bold border-purple-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-purple-400'
                      }`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400">Bebas diisi angka bulat berapa saja (cth: 10 atau 100)</span>
              </div>
            </div>
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
              <textarea
                value={formData.receiptFooterMessage}
                onChange={(e) => setFormData({ ...formData, receiptFooterMessage: e.target.value })}
                rows={2}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Hardware Direct Thermal Printer & Cash Drawer (ESC/POS) */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Printer className="w-4 h-4 text-emerald-500" />
                <span>Hardware Thermal Printer &amp; Laci Kas (ESC/POS)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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
                <select
                  value={printerConfig.connectionType}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, connectionType: e.target.value as any })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
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
                <select
                  value={printerConfig.paperWidth}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, paperWidth: e.target.value as any })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value="58mm">58 mm (Standar Mini / 32 Kolom)</option>
                  <option value="80mm">80 mm (Lebar Kasir / 48 Kolom)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Baud Rate (Port Serial)
                </label>
                <select
                  value={printerConfig.baudRate}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, baudRate: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs"
                >
                  <option value={9600}>9600 bps (Standar Xprinter/Epson)</option>
                  <option value={19200}>19200 bps</option>
                  <option value={38400}>38400 bps</option>
                  <option value={115200}>115200 bps</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={printerConfig.kickCashDrawer}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, kickCashDrawer: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Buka Laci Kas Otomatis (RJ11 Pulse)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <input
                  type="checkbox"
                  checked={printerConfig.autoCut}
                  onChange={(e) => setPrinterConfig({ ...printerConfig, autoCut: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Auto-Cut Kertas Struk Selesai Cetak
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
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tes Cetak Struk ESC/POS</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestDrawer}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition disabled:opacity-50"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Aturan 50% PO
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
              Sistem menetapkan <strong>batas minimal stok adalah 50% dari jumlah order terakhir</strong> (PO Faktur). Ketika stok barang di rak mencapai atau di bawah batas ini, sistem akan memunculkan peringatan stok menipis agar toko tidak mengalami kekosongan barang (stockout).
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Persentase Batas Minimal (% Order)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={100}
                    step={5}
                    value={formData.minStockRulePercentage ?? 50}
                    onChange={(e) => setFormData({ ...formData, minStockRulePercentage: Number(e.target.value) })}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                </div>
                <span className="text-[10px] text-slate-400">Default: 50% dari kuantitas order PO</span>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <input
                    type="checkbox"
                    checked={formData.autoUpdateMinStockFromOrder !== false}
                    onChange={(e) => setFormData({ ...formData, autoUpdateMinStockFromOrder: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Auto-Update saat Terima PO
                  </span>
                </label>
                <span className="text-[10px] text-slate-400 mt-1">Otomatis update min stock saat faktur masuk</span>
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
                className="px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Terapkan Aturan 50% ke Semua Produk Sekarang</span>
              </button>
              {syncMessage && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  ✓ {syncMessage}
                </span>
              )}
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
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <span>Pusat Sinkronisasi &amp; SQLite WAL</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold text-[10px] font-mono">
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
                  className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                  title="Unduh langsung berkas backup .JSON ke komputer Anda"
                >
                  <HardDriveDownload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Ekspor .JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setIsBackupRestoreOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <span>Pusat Cadangan</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                IndexedDB Ultra-Capacity
              </span>
              <span>Kapasitas penyimpanan puluhan GB tanpa batas 5MB LocalStorage.</span>
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
          <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Launch Status Hero */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-slate-900 border border-emerald-500/30 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                    Ready to Launch
                  </span>
                  <span className="text-slate-400 text-[11px]">Mode Produksi Siap Pakai</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Kesiapan Peluncuran Toko &amp; Kasir
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Aplikasi telah dikonfigurasi penuh tanpa data demo yang bocor. Gunakan halaman ini untuk membersihkan riwayat pengujian sebelum membuka toko untuk pembeli nyata pertama.
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Rocket className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            {/* Operational Checklist Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Identitas Toko</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                  {formData.storeName || 'Belum diisi'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {formData.branchName || 'Cabang Utama'} • {formData.phone || 'No Telp Belum Diisi'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Keamanan Kasir (RBAC)</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                  {activeEmployee ? activeEmployee.name : 'Belum Login'}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
                  {activeEmployee ? activeEmployee.roleTitle : 'Siap Digunakan'} • PIN Terlindungi
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Riwayat Transaksi</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-xs">
                  {transactions.length} Transaksi Tercatat
                </div>
                <div className="text-[10px] text-slate-500">
                  {transactions.length === 0 ? '✓ Bersih (Omset Rp 0)' : 'Perlu dibersihkan sebelum buka'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Katalog Produk</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-xs">
                  {products.length} Produk Terdaftar
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {cart.length > 0 ? `${cart.length} item di kasir` : 'Keranjang kasir kosong'}
                </div>
              </div>
            </div>

            {/* Success notification */}
            {launchSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Inisialisasi Peluncuran Sukses!</div>
                  <div className="text-[11px] mt-0.5 leading-relaxed">{launchSuccessMessage}</div>
                </div>
              </div>
            )}

            {/* Error notification */}
            {launchErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{launchErrorMessage}</span>
              </div>
            )}

            {/* Clean Slate Action Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Pembersihan Data Demo &amp; Uji Coba</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih opsi di bawah ini untuk mengembalikan status operasional ke hari pertama buka toko:
              </p>

              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanTxOption}
                    onChange={(e) => setCleanTxOption(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Hapus Semua Transaksi Percobaan (Reset Omset ke Rp 0)
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Menghapus riwayat transaksi demo agar buku kasir dan laporan keuangan murni menghitung penjualan nyata.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cleanCartOption}
                    onChange={(e) => setCleanCartOption(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      Kosongkan Keranjang Kasir &amp; Antrean Pesanan Parkir
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Mengosongkan nota gantung / held order uji coba agar antrean kasir bersih.
                    </div>
                  </div>
                </label>

                {/* Catalog Choice */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Pengaturan Katalog Produk Awal:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      className={`p-2 rounded-lg border cursor-pointer flex flex-col justify-between ${
                        productCatalogChoice === 'keep_starter'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="catalog_choice"
                          checked={productCatalogChoice === 'keep_starter'}
                          onChange={() => setProductCatalogChoice('keep_starter')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                          Gunakan Master Produk Siap Pakai
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 pl-5">
                        Mempertahankan template 16 barang sembako &amp; minimarket (Indomie, Aqua, Beras, dll.) yang dapat diedit langsung.
                      </span>
                    </label>

                    <label
                      className={`p-2 rounded-lg border cursor-pointer flex flex-col justify-between ${
                        productCatalogChoice === 'blank_catalog'
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="catalog_choice"
                          checked={productCatalogChoice === 'blank_catalog'}
                          onChange={() => setProductCatalogChoice('blank_catalog')}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
                          Kosongkan Seluruh Katalog
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 pl-5">
                        Mulai dari 0 produk untuk toko yang ingin menginput sendiri atau mengimpor data produk via Excel/CSV.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Execution confirmation */}
              {!isConfirmingLaunch ? (
                <button
                  type="button"
                  id="btn-prepare-store-launch"
                  onClick={() => setIsConfirmingLaunch(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all active:scale-[0.99]"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Jalankan Inisialisasi Buka Toko (Ready to Launch)</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Konfirmasi Persiapan Peluncuran Toko</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    Sistem akan secara otomatis membuat Cadangan Pengaman (Restore Point Snapshot) sebelum membersihkan data uji coba. Lanjutkan inisialisasi?
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingLaunch(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      id="btn-confirm-execute-launch"
                      onClick={handleExecuteLaunch}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Ya, Siapkan Toko Sekarang</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick backup shortcut */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
              <span>Ingin mencadangkan data terlebih dahulu?</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setIsBackupRestoreOpen(true);
                }}
                className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Database className="w-3 h-3" />
                <span>Buka Pusat Cadangan &amp; Restore</span>
              </button>
            </div>

            {/* Close footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Selesai &amp; Buka Kasir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
