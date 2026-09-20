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
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { StoreSettings } from '../types';
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
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, setIsBackupRestoreOpen, downloadBackupFile, applyMinStockRuleToAllProducts } = usePOS();
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Hardware Printer state
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(getSavedPrinterConfig());
  const [hardwareSupport, setHardwareSupport] = useState({ hasSerial: false, hasBluetooth: false });
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setHardwareSupport(checkPrinterHardwareSupport());
    setPrinterConfig(getSavedPrinterConfig());
  }, [isOpen]);

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
    updateSettings(formData);
    savePrinterConfig(printerConfig);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
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
              POS Terminal & Store Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Store Info */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Store className="w-4 h-4 text-emerald-500" />
              <span>Business Profile</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Store / Brand Name
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
                  Branch / Terminal Name
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
                Store Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Store Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
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
                  min={1000}
                  step={1000}
                  value={formData.pointsRatio || 10000}
                  onChange={(e) => setFormData({ ...formData, pointsRatio: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="10000"
                />
                <span className="text-[10px] text-slate-400">1 poin per kelipatan belanja</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Nilai Diskon Poin (Rp/Poin)
                </label>
                <input
                  type="number"
                  min={1}
                  step={10}
                  value={formData.pointRedemptionRate ?? 100}
                  onChange={(e) => setFormData({ ...formData, pointRedemptionRate: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="100"
                />
                <span className="text-[10px] text-slate-400">Nilai diskon per 1 poin (cth: Rp 100)</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1 text-xs">
                  Min. Poin Ditukar
                </label>
                <input
                  type="number"
                  min={1}
                  step={5}
                  value={formData.minRedeemPoints ?? 10}
                  onChange={(e) => setFormData({ ...formData, minRedeemPoints: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  placeholder="10"
                />
                <span className="text-[10px] text-slate-400">Ambang batas minimum tukar poin</span>
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
      </div>
    </div>
  );
};
