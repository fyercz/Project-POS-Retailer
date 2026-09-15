import React, { useState, useRef } from 'react';
import {
  X,
  Database,
  History,
  HardDriveDownload,
  UploadCloud,
  DownloadCloud,
  RotateCcw,
  Trash2,
  Check,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Plus,
  Search,
  Calendar,
  User,
  Package,
  Receipt,
  Users,
  Building2,
  Info,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Copy,
  CheckCheck,
  Sliders,
  ChevronDown,
  ChevronUp,
  FileCode,
  FolderDown,
  ShieldX,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { BackupPayload, RestorePoint } from '../types';
import { formatRupiah } from '../utils/formatters';
import { validateBackupFile, BackupValidationReport } from '../utils/backupValidator';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose }) => {
  const {
    products,
    transactions,
    customers,
    suppliers,
    settings,
    restorePoints,
    createRestorePoint,
    deleteRestorePoint,
    restoreFromPoint,
    restoreFromPayload,
    generateBackupPayload,
    downloadBackupFile,
  } = usePOS();

  const [activeTab, setActiveTab] = useState<'points' | 'files' | 'guide'>('points');

  // Export Customization State
  const [exportCustomName, setExportCustomName] = useState('');
  const [exportPretty, setExportPretty] = useState(true);
  const [exportModules, setExportModules] = useState<Record<string, boolean>>({
    products: true,
    transactions: true,
    customers: true,
    suppliers: true,
    salesReturns: true,
    supplierPurchases: true,
    settings: true,
    employees: true,
    vouchers: true,
    shifts: true,
  });
  const [isExportAdvancedOpen, setIsExportAdvancedOpen] = useState(false);
  const [jsonPreviewModal, setJsonPreviewModal] = useState<{
    isOpen: boolean;
    content: string;
    fileName: string;
    sizeKb: string;
    itemCount: number;
  }>({
    isOpen: false,
    content: '',
    fileName: '',
    sizeKb: '',
    itemCount: 0,
  });
  const [hasCopiedJson, setHasCopiedJson] = useState(false);

  // New Restore Point Form State
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isCreatingPoint, setIsCreatingPoint] = useState(false);
  const [pointCreationSuccess, setPointCreationSuccess] = useState(false);

  // Search & Filter Restore Points
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation Modal for Restoring a Point or Payload
  const [confirmRestoreModal, setConfirmRestoreModal] = useState<{
    isOpen: boolean;
    source: 'point' | 'file';
    targetPoint?: RestorePoint;
    targetPayload?: BackupPayload;
    validationReport?: BackupValidationReport | null;
    restoreMode: 'overwrite' | 'merge';
    autoSafetyPoint: boolean;
    acknowledgedOverwrite: boolean;
  }>({
    isOpen: false,
    source: 'point',
    restoreMode: 'overwrite',
    autoSafetyPoint: true,
    acknowledgedOverwrite: false,
  });

  // Confirmation Modal for Deleting a Restore Point
  const [confirmDeletePointId, setConfirmDeletePointId] = useState<string | null>(null);

  // File Upload & Pre-Restore Validation State
  const [uploadedPayload, setUploadedPayload] = useState<BackupPayload | null>(null);
  const [validationReport, setValidationReport] = useState<BackupValidationReport | null>(null);
  const [showChecklistDetails, setShowChecklistDetails] = useState<boolean>(false);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadFileSize, setUploadFileSize] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action feedback message
  const [statusNotification, setStatusNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setStatusNotification({ type, message });
    setTimeout(() => {
      setStatusNotification(null);
    }, 6000);
  };

  const handleCreatePoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreatingPoint(true);
    try {
      const pt = createRestorePoint(newTitle, newNote, 'manual');
      setNewTitle('');
      setNewNote('');
      setPointCreationSuccess(true);
      setTimeout(() => setPointCreationSuccess(false), 2500);
      showToast('success', `Titik pemulihan "${pt.title}" berhasil dibuat dan tersimpan aman!`);
    } catch {
      showToast('error', 'Gagal membuat titik pemulihan.');
    } finally {
      setIsCreatingPoint(false);
    }
  };

  const handleApplyPresetTitle = (preset: string) => {
    setNewTitle(preset);
  };

  const handlePromptRestorePoint = (point: RestorePoint) => {
    setConfirmRestoreModal({
      isOpen: true,
      source: 'point',
      targetPoint: point,
      restoreMode: 'overwrite',
      autoSafetyPoint: true,
      acknowledgedOverwrite: false,
    });
  };

  const handleExecuteRestore = () => {
    const { source, targetPoint, targetPayload, restoreMode, autoSafetyPoint } = confirmRestoreModal;

    let res: { success: boolean; message: string };
    if (source === 'point' && targetPoint) {
      res = restoreFromPoint(targetPoint.id, restoreMode, autoSafetyPoint);
    } else if (source === 'file' && targetPayload) {
      res = restoreFromPayload(targetPayload, restoreMode, autoSafetyPoint);
    } else {
      res = { success: false, message: 'Sumber data pemulihan tidak ditemukan.' };
    }

    setConfirmRestoreModal((prev) => ({ ...prev, isOpen: false }));

    if (res.success) {
      showToast('success', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  const handleDeletePoint = (id: string) => {
    deleteRestorePoint(id);
    setConfirmDeletePointId(null);
    showToast('info', 'Titik pemulihan telah dihapus dari sistem.');
  };

  const handleDownloadSpecificPoint = (point: RestorePoint) => {
    const jsonStr = JSON.stringify(point.payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const cleanTitle = point.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const dateStr = point.createdAt.slice(0, 10);
    const fileName = `snapshot_${cleanTitle}_${dateStr}.json`;

    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    setTimeout(() => {
      if (downloadAnchor.parentNode) {
        downloadAnchor.parentNode.removeChild(downloadAnchor);
      }
      URL.revokeObjectURL(url);
    }, 300);
    showToast('success', `Berkas snapshot "${fileName}" (${(blob.size / 1024).toFixed(1)} KB) berhasil diunduh ke komputer Anda.`);
  };

  const handleQuickDownload = () => {
    const res = downloadBackupFile({ pretty: true });
    showToast('success', `Berkas cadangan lengkap "${res.fileName}" (${res.sizeKb} KB) berhasil disimpan ke komputer Anda.`);
  };

  const handleCustomDownload = () => {
    const res = downloadBackupFile({
      customFileName: exportCustomName.trim() || undefined,
      pretty: exportPretty,
      selectedModules: exportModules,
    });
    showToast('success', `Berkas cadangan "${res.fileName}" (${res.sizeKb} KB) berhasil disimpan ke komputer Anda.`);
  };

  const handleOpenJsonPreview = () => {
    const basePayload = generateBackupPayload();
    let finalData = { ...basePayload.data };
    if (isExportAdvancedOpen) {
      finalData = {
        products: exportModules.products ? basePayload.data.products : [],
        suppliers: exportModules.suppliers ? basePayload.data.suppliers : [],
        customers: exportModules.customers ? basePayload.data.customers : [],
        transactions: exportModules.transactions ? basePayload.data.transactions : [],
        salesReturns: exportModules.salesReturns ? basePayload.data.salesReturns : [],
        purchaseReturns: exportModules.salesReturns ? basePayload.data.purchaseReturns : [],
        supplierPurchases: exportModules.supplierPurchases ? basePayload.data.supplierPurchases : [],
        settings: exportModules.settings ? basePayload.data.settings : basePayload.data.settings,
        vouchers: exportModules.vouchers ? basePayload.data.vouchers : [],
        employees: exportModules.employees ? basePayload.data.employees : [],
        heldOrders: exportModules.transactions ? basePayload.data.heldOrders : [],
        currentShift: exportModules.shifts ? basePayload.data.currentShift : null,
      };
    }
    const payload = {
      ...basePayload,
      data: finalData,
      summary: {
        totalProducts: finalData.products.length,
        totalSuppliers: finalData.suppliers.length,
        totalCustomers: finalData.customers.length,
        totalTransactions: finalData.transactions.length,
        totalSalesReturns: finalData.salesReturns.length,
        totalSupplierPurchases: finalData.supplierPurchases.length,
        totalEmployees: finalData.employees.length,
      },
    };

    const jsonStr = exportPretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
    const sizeKb = (new Blob([jsonStr]).size / 1024).toFixed(1);
    const cleanStore = (settings.storeName || 'pos_retail').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const defaultName = `backup_${cleanStore}_${dateStr}.json`;
    const targetName = exportCustomName.trim()
      ? (exportCustomName.toLowerCase().endsWith('.json') ? exportCustomName : exportCustomName + '.json')
      : defaultName;

    setJsonPreviewModal({
      isOpen: true,
      content: jsonStr,
      fileName: targetName,
      sizeKb,
      itemCount:
        payload.summary.totalProducts +
        payload.summary.totalTransactions +
        payload.summary.totalCustomers,
    });
  };

  const handleCopyJsonToClipboard = () => {
    if (!jsonPreviewModal.content) return;
    navigator.clipboard
      .writeText(jsonPreviewModal.content)
      .then(() => {
        setHasCopiedJson(true);
        setTimeout(() => setHasCopiedJson(false), 2500);
        showToast('success', 'Seluruh teks JSON cadangan berhasil disalin ke clipboard!');
      })
      .catch(() => {
        showToast('error', 'Gagal menyalin teks ke clipboard.');
      });
  };

  const handleResetUploadedFile = () => {
    setUploadedPayload(null);
    setValidationReport(null);
    setUploadError(null);
    setUploadFileName('');
    setUploadFileSize('');
    setShowChecklistDetails(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseAndValidateFile = (file: File) => {
    setUploadError(null);
    setUploadedPayload(null);
    setValidationReport(null);
    setUploadFileName(file.name);
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    setUploadFileSize(sizeStr);

    if (!file.name.toLowerCase().endsWith('.json')) {
      const msg = 'Hanya berkas berformat .json cadangan yang didukung.';
      setUploadError(msg);
      showToast('error', msg);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const report = validateBackupFile(text, settings, file.name, sizeStr);
        setValidationReport(report);

        if (report.canRestore && report.sanitizedPayload) {
          setUploadedPayload(report.sanitizedPayload);
          setUploadError(null);
          if (report.status === 'passed') {
            showToast('success', `Berkas "${file.name}" lolos 100% uji integritas & siap dipulihkan.`);
          } else {
            showToast('info', `Berkas "${file.name}" lolos dengan beberapa catatan kompatibilitas.`);
          }
        } else {
          setUploadedPayload(null);
          setUploadError(report.statusMessage || 'Uji integritas berkas gagal. Berkas rusak atau tidak kompatibel.');
          showToast('error', 'Integritas berkas tidak lolos validasi. Pemulihan dicegah demi keamanan.');
        }
      } catch (err: any) {
        setUploadError(err?.message || 'Gagal membaca atau mem-parsing berkas JSON.');
        setUploadedPayload(null);
        setValidationReport(null);
        showToast('error', 'Gagal memproses berkas JSON.');
      }
    };
    reader.onerror = () => {
      setUploadError('Terjadi kesalahan saat membaca berkas dari sistem komputer.');
      setValidationReport(null);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseAndValidateFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      parseAndValidateFile(file);
    }
  };

  const filteredPoints = restorePoints.filter((rp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rp.title.toLowerCase().includes(q) ||
      (rp.note && rp.note.toLowerCase().includes(q)) ||
      rp.createdBy.toLowerCase().includes(q)
    );
  });

  const formatDateIndo = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="backup-restore-modal"
        className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Pusat Cadangan &amp; Titik Pemulihan
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                  Backup &amp; Restore
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Amankan seluruh database ritel, simpan snapshot titik pulih, dan restore data kapan saja
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live System Data Ribbon */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100/80 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              <strong>{products.length}</strong> Produk
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Receipt className="w-3.5 h-3.5 text-blue-500" />
              <strong>{transactions.length}</strong> Riwayat Nota
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <strong>{customers.length}</strong> Pelanggan
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <strong>{suppliers.length}</strong> Supplier
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickDownload}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
              title="Unduh seluruh basis data saat ini ke berkas .json"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>Unduh Cadangan .JSON</span>
            </button>
          </div>
        </div>

        {/* Toast / Notification Banner */}
        {statusNotification && (
          <div
            className={`mx-4 sm:mx-6 mt-3 p-3 rounded-xl flex items-center justify-between text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 border ${
              statusNotification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : statusNotification.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusNotification.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : statusNotification.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              )}
              <span>{statusNotification.message}</span>
            </div>
            <button
              onClick={() => setStatusNotification(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('points')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'points'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Titik Pemulihan (Snapshots)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">
              {restorePoints.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HardDriveDownload className="w-4 h-4" />
            <span>Ekspor &amp; Impor Berkas (.JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Panduan &amp; Keamanan</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
          {/* TAB 1: RESTORE POINTS (SNAPSHOTS) */}
          {activeTab === 'points' && (
            <div className="space-y-5">
              {/* Creator Card */}
              <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:from-emerald-950/20 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Buat Titik Pemulihan Baru (Restore Point)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Ambil snapshot instan status toko saat ini untuk cadangan sebelum perubahan besar.
                      </p>
                    </div>
                  </div>
                  {pointCreationSuccess && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Tersimpan!
                    </span>
                  )}
                </div>

                <form onSubmit={handleCreatePoint} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Nama / Judul Titik Pemulihan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Cth: Pra-Stok Opname Akhir Pekan..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Catatan Opsional
                      </label>
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Keterangan singkat alasan snapshot..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Preset Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Preset Cepat:</span>
                    {[
                      'Sebelum Stok Opname',
                      'Sebelum Tutup Kasir',
                      'Pra-Ubah Harga & Diskon',
                      'Cadangan Rutin Mingguan',
                      'Sebelum Impor Data Baru',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleApplyPresetTitle(preset)}
                        className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isCreatingPoint || !newTitle.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isCreatingPoint ? 'Menyimpan...' : 'Simpan Titik Pemulihan Ini'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Restore Points List Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Daftar Titik Pemulihan Tersimpan ({filteredPoints.length})
                    </h4>
                  </div>
                  <div className="relative w-48 sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama titik pulih..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {filteredPoints.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
                    <Database className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {searchQuery ? 'Tidak ada titik pemulihan yang cocok dengan pencarian.' : 'Belum ada titik pemulihan tambahan.'}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Buat titik pemulihan pertama Anda menggunakan form di atas untuk melindungi data toko dari kesalahan manusia.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredPoints.map((rp) => {
                      const isAuto = rp.type.startsWith('auto_');
                      return (
                        <div
                          key={rp.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                  {rp.title}
                                </h5>
                                {isAuto ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                                    Otomatis Sistem
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 font-mono text-[10px] font-bold border border-blue-300 dark:border-blue-800">
                                    Manual
                                  </span>
                                )}
                              </div>
                              {rp.note && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                  "{rp.note}"
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDateIndo(rp.createdAt)}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  Oleh: {rp.createdBy}
                                </span>
                              </div>
                            </div>

                            {/* Actions on this point */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDownloadSpecificPoint(rp)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Unduh snapshot ini ke file JSON"
                              >
                                <DownloadCloud className="w-3.5 h-3.5 text-blue-500" />
                                <span className="hidden sm:inline">Unduh JSON</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePromptRestorePoint(rp)}
                                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                                title="Kembalikan sistem ke kondisi titik pulih ini"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Pulihkan</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmDeletePointId(rp.id)}
                                className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Hapus titik pemulihan ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Point Summary Badges */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3 sm:gap-4 flex-wrap text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              📦 <strong>{rp.summary.totalProducts}</strong> Produk
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              🧾 <strong>{rp.summary.totalTransactions}</strong> Nota Transaksi
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              👥 <strong>{rp.summary.totalCustomers}</strong> Pelanggan
                            </span>
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              🏢 <strong>{rp.summary.totalSuppliers}</strong> Supplier
                            </span>
                            {rp.summary.totalStockValue !== undefined && rp.summary.totalStockValue > 0 && (
                              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md">
                                💰 Aset: <strong>{formatRupiah(rp.summary.totalStockValue)}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FILE BACKUP (EXPORT & IMPORT JSON) */}
          {activeTab === 'files' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Export Backup JSON File */}
              <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <DownloadCloud className="w-6 h-6" />
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                      Ekspor Eksternal .JSON
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Ekspor Berkas Cadangan (.JSON)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                      Unduh seluruh data operasional toko ke berkas JSON mandiri di komputer Anda. Simpan salinan di flashdisk, harddisk eksternal, atau Google Drive untuk antisipasi kerusakan perangkat.
                    </p>
                  </div>

                  {/* Summary of Data to Export */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Cakupan Data Toko Saat Ini:
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Siap Diekspor
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg">
                        <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span><strong>{products.length}</strong> Produk &amp; Grosir</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg">
                        <Receipt className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span><strong>{transactions.length}</strong> Nota Transaksi</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg">
                        <Users className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span><strong>{customers.length}</strong> Pelanggan CRM</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg">
                        <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span><strong>{suppliers.length}</strong> Supplier &amp; Retur</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Export Button */}
                  <button
                    type="button"
                    onClick={handleQuickDownload}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
                  >
                    <HardDriveDownload className="w-4 h-4" />
                    <span>Unduh Cadangan Lengkap (.json)</span>
                  </button>

                  {/* Advanced Options Accordion */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setIsExportAdvancedOpen(!isExportAdvancedOpen)}
                      className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                        <span>Kustomisasi Nama Berkas &amp; Pilihan Modul</span>
                      </span>
                      {isExportAdvancedOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isExportAdvancedOpen && (
                      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs bg-slate-50/50 dark:bg-slate-850/40 animate-in fade-in duration-150">
                        {/* Custom file name */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Nama Berkas (.json)
                          </label>
                          <input
                            type="text"
                            value={exportCustomName}
                            onChange={(e) => setExportCustomName(e.target.value)}
                            placeholder="Contoh: backup_toko_januari.json"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                          />
                        </div>

                        {/* Format selector */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Format Indentasi JSON
                          </label>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setExportPretty(true)}
                              className={`py-1 px-2 rounded-lg border text-center font-medium cursor-pointer transition-colors ${
                                exportPretty
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Format Rapi (2 Spasi)
                            </button>
                            <button
                              type="button"
                              onClick={() => setExportPretty(false)}
                              className={`py-1 px-2 rounded-lg border text-center font-medium cursor-pointer transition-colors ${
                                !exportPretty
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              Format Padat (Minified)
                            </button>
                          </div>
                        </div>

                        {/* Module selection */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              Pilih Modul Data:
                            </label>
                            <div className="flex items-center gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() =>
                                  setExportModules({
                                    products: true,
                                    transactions: true,
                                    customers: true,
                                    suppliers: true,
                                    salesReturns: true,
                                    supplierPurchases: true,
                                    settings: true,
                                    employees: true,
                                    vouchers: true,
                                    shifts: true,
                                  })
                                }
                                className="text-emerald-600 hover:underline cursor-pointer font-medium"
                              >
                                Pilih Semua
                              </button>
                              <span className="text-slate-300 dark:text-slate-700">|</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setExportModules({
                                    products: false,
                                    transactions: false,
                                    customers: false,
                                    suppliers: false,
                                    salesReturns: false,
                                    supplierPurchases: false,
                                    settings: true,
                                    employees: false,
                                    vouchers: false,
                                    shifts: false,
                                  })
                                }
                                className="text-slate-500 hover:underline cursor-pointer"
                              >
                                Minimal
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportModules.products}
                                onChange={(e) =>
                                  setExportModules((prev) => ({ ...prev, products: e.target.checked }))
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              />
                              <span>Produk &amp; Stok ({products.length})</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportModules.transactions}
                                onChange={(e) =>
                                  setExportModules((prev) => ({ ...prev, transactions: e.target.checked }))
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              />
                              <span>Transaksi &amp; Nota ({transactions.length})</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportModules.customers}
                                onChange={(e) =>
                                  setExportModules((prev) => ({ ...prev, customers: e.target.checked }))
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              />
                              <span>Pelanggan ({customers.length})</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportModules.suppliers}
                                onChange={(e) =>
                                  setExportModules((prev) => ({ ...prev, suppliers: e.target.checked }))
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              />
                              <span>Supplier ({suppliers.length})</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportModules.salesReturns}
                                onChange={(e) =>
                                  setExportModules((prev) => ({ ...prev, salesReturns: e.target.checked }))
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              />
                              <span>Retur Jual &amp; Beli</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportModules.employees}
                                onChange={(e) =>
                                  setExportModules((prev) => ({ ...prev, employees: e.target.checked }))
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              />
                              <span>Staf &amp; Hak Akses</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportModules.settings}
                                onChange={(e) =>
                                  setExportModules((prev) => ({ ...prev, settings: e.target.checked }))
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              />
                              <span>Setelan &amp; Struk</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exportModules.shifts}
                                onChange={(e) =>
                                  setExportModules((prev) => ({ ...prev, shifts: e.target.checked }))
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                              />
                              <span>Shift &amp; Kasir</span>
                            </label>
                          </div>
                        </div>

                        {/* Custom Export Actions */}
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleOpenJsonPreview}
                            className="flex-1 py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <FileCode className="w-3.5 h-3.5 text-blue-500" />
                            <span>Pratinjau JSON</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCustomDownload}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                          >
                            <FolderDown className="w-3.5 h-3.5" />
                            <span>Unduh Kustom</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Offsite backup note */}
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>
                      Berkas .JSON ini otomatis tersimpan di folder Download komputer Anda. Anda bebas menyalinnya ke Flashdisk USB atau Google Drive sebagai arsip luar jaringan (*offsite copy*).
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Restore from Uploaded JSON File with Integrity Validation */}
              <div className="bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    {validationReport && (
                      <button
                        type="button"
                        onClick={handleResetUploadedFile}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Ganti Berkas</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Pulihkan dari Berkas Cadangan (.JSON)</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                      Dilengkapi lapisan verifikasi &amp; uji integritas ketat untuk mencegah korupsi data basis data kasir.
                    </p>
                  </div>

                  {/* Drag and drop zone (shown when no report or file is being replaced) */}
                  {!validationReport && (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                        isDragOver
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".json,application/json"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <FileCheck className="w-9 h-9 text-blue-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Klik untuk memilih berkas atau seret ke sini
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Format berkas cadangan .JSON yang sah
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Uji validasi integritas otomatis sebelum pemulihan</span>
                      </div>
                    </div>
                  )}

                  {/* Upload Error Banner when no report */}
                  {!validationReport && uploadError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* PRE-RESTORE VALIDATION & INTEGRITY INSPECTION PANEL */}
                  {validationReport && (
                    <div className="space-y-3 pt-1">
                      {/* File Metadata Pill */}
                      <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                              {validationReport.fileInfo.fileName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Ukuran: {validationReport.fileInfo.fileSize} • Aplikasi: {validationReport.fileInfo.app}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                          v{validationReport.fileInfo.version}
                        </span>
                      </div>

                      {/* Overall Status Banner */}
                      {validationReport.status === 'passed' && (
                        <div className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-[13px]">
                              Lolos Uji Integritas &amp; Kompatibilitas 100%
                            </span>
                            <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                              {validationReport.statusMessage}
                            </span>
                          </div>
                        </div>
                      )}

                      {validationReport.status === 'warning' && (
                        <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-[13px]">
                              Lolos dengan Catatan Kompatibilitas
                            </span>
                            <span className="text-[11px] text-amber-800 dark:text-amber-300">
                              {validationReport.statusMessage}
                            </span>
                          </div>
                        </div>
                      )}

                      {validationReport.status === 'failed' && (
                        <div className="p-3 rounded-xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                          <ShieldX className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-[13px]">
                              Gagal Uji Integritas: Pemulihan Dicegah
                            </span>
                            <span className="text-[11px] text-rose-800 dark:text-rose-300">
                              {validationReport.statusMessage}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Side-by-side Impact Comparison Table */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                            <span>Matriks Komparasi Data</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Pra-Pemulihan
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                          <div className="space-y-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Database Aktif (Saat Ini)
                            </div>
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              🏪 {settings.storeName || 'Toko Ritel'}
                            </div>
                            <div className="text-slate-600 dark:text-slate-400 space-y-0.5">
                              <div>📦 {products.length} Produk</div>
                              <div>🧾 {transactions.length} Transaksi</div>
                              <div>👥 {customers.length} Pelanggan</div>
                            </div>
                          </div>

                          <div className="space-y-1.5 p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                            <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
                              <span>Berkas JSON Masuk</span>
                              {validationReport.fileInfo.storeName === settings.storeName ? (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-1 rounded">
                                  Cocok
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950 px-1 rounded">
                                  Toko Lain
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-blue-900 dark:text-blue-200 truncate">
                              🏪 {validationReport.fileInfo.storeName || 'Tidak Diketahui'}
                            </div>
                            <div className="text-slate-600 dark:text-slate-400 space-y-0.5">
                              <div>📦 {validationReport.metrics.validProductsCount} Produk Valid</div>
                              <div>🧾 {validationReport.metrics.validTransactionsCount} Transaksi Valid</div>
                              <div>👥 {validationReport.metrics.validCustomersCount} Pelanggan Valid</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Warnings and Errors Lists */}
                      {validationReport.warnings.length > 0 && (
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs space-y-1">
                          <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Peringatan Kompatibilitas ({validationReport.warnings.length}):</span>
                          </div>
                          <ul className="list-disc list-inside text-[11px] text-amber-700 dark:text-amber-400 space-y-0.5 pl-1">
                            {validationReport.warnings.map((warn, i) => (
                              <li key={i}>{warn}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationReport.criticalErrors.length > 0 && (
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs space-y-1">
                          <div className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 text-[11px]">
                            <ShieldX className="w-3.5 h-3.5 text-rose-600" />
                            <span>Kesalahan Kritis ({validationReport.criticalErrors.length}):</span>
                          </div>
                          <ul className="list-disc list-inside text-[11px] text-rose-700 dark:text-rose-400 space-y-0.5 pl-1">
                            {validationReport.criticalErrors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Toggleable 8-Point Diagnostic Checklist */}
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => setShowChecklistDetails((prev) => !prev)}
                          className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>8 Uji Diagnostik Sistem &amp; Integritas Skema</span>
                          </span>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold">
                            {showChecklistDetails ? (
                              <>
                                <span>Tutup</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                <span>Lihat Rincian</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </span>
                        </button>

                        {showChecklistDetails && (
                          <div className="p-3 pt-0 space-y-2 border-t border-slate-100 dark:border-slate-800">
                            {validationReport.checks.map((c) => (
                              <div
                                key={c.id}
                                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {c.name}
                                  </span>
                                  {c.status === 'passed' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                      <Check className="w-3 h-3" /> Lolos
                                    </span>
                                  )}
                                  {c.status === 'warning' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                      <AlertTriangle className="w-3 h-3" /> Catatan
                                    </span>
                                  )}
                                  {c.status === 'failed' && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px]">
                                      <ShieldX className="w-3 h-3" /> Gagal
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400">
                                  {c.details}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  {validationReport && !validationReport.canRestore ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                      >
                        <ShieldX className="w-4 h-4 text-rose-500" />
                        <span>Pemulihan Diblokir (Integritas Gagal)</span>
                      </button>
                      <p className="text-[10px] text-center text-rose-600 dark:text-rose-400">
                        Basis data Anda terlindungi. Berkas JSON ini tidak dapat dipulihkan karena berpotensi merusak database kasir.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!uploadedPayload || !validationReport?.canRestore}
                      onClick={() => {
                        if (!uploadedPayload) return;
                        setConfirmRestoreModal({
                          isOpen: true,
                          source: 'file',
                          targetPayload: uploadedPayload,
                          validationReport,
                          restoreMode: 'overwrite',
                          autoSafetyPoint: true,
                          acknowledgedOverwrite: false,
                        });
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-all active:scale-95"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Lanjutkan Pemulihan Berkas Terverifikasi...</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GUIDE & SECURITY TIPS */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-850 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span>Prinsip Keamanan Basis Data Ritel (Disaster Recovery)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                  Sistem POS menyimpan seluruh transaksi kasir, master katalog, dan pelanggan di penyimpanan lokal browser yang tangguh. Agar operasional toko Anda selalu aman dari kehilangan data mendadak, ikuti prosedur standar berikut:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white">Titik Pulih Sebelum Aksi Besar</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Selalu buat <strong>Titik Pemulihan (Snapshot)</strong> sebelum melakukan Stok Opname massal, impor ribuan data dari Excel, atau perubahan massal harga grosir.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white">Unduh Cadangan .JSON Mingguan</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Unduh file <strong>.json cadangan penuh</strong> minimal seminggu sekali (atau tiap tutup buku akhir bulan) dan simpan ke Flashdisk cadangan atau Google Drive owner.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold text-xs">
                    03
                  </div>
                  <h5 className="font-bold text-slate-900 dark:text-white">Jaring Pengaman Otomatis</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Setiap kali Anda menekan "Pulihkan (Restore)", sistem akan <strong>secara otomatis membuat snapshot pengaman</strong> beberapa detik sebelum data ditimpa. Anda selalu bisa membatalkan / revert!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
            <ShieldAlert className="w-4 h-4 text-emerald-500" />
            <span>Hak akses pencadangan &amp; pemulihan dilindungi otorisasi Supervisor / Owner.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* CONFIRM RESTORE EXECUTION OVERLAY DIALOG - "ARE YOU SURE?" WITH VISUAL OVERWRITE WARNING */}
      {confirmRestoreModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 max-w-lg w-full max-h-[92vh] overflow-y-auto p-6 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Header with Visual Warning Icon & "Are You Sure?" */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400 shadow-xs">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold text-[10px] tracking-wider uppercase mb-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>Konfirmasi Tindakan Kritis</span>
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  Are you sure? / Apakah Anda yakin?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {confirmRestoreModal.source === 'point'
                    ? `Memulihkan dari Titik Pulih: "${confirmRestoreModal.targetPoint?.title}"`
                    : `Memulihkan dari Berkas JSON: "${confirmRestoreModal.validationReport?.fileInfo.fileName || uploadFileName}"`}
                </p>
              </div>
            </div>

            {/* Visual Warning Banner: Explicitly stating that existing data will be overwritten */}
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400/90 dark:border-rose-700 text-xs space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-extrabold text-xs uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>PERINGATAN: DATA YANG ADA SAAT INI AKAN DITIMPA!</span>
              </div>

              <p className="text-rose-950 dark:text-rose-100 text-xs leading-relaxed">
                Tindakan ini secara langsung akan <strong>menimpa dan menggantikan seluruh data operasional kasir yang ada saat ini</strong>. Master katalog produk, stok inventaris toko, riwayat nota transaksi penjualan, dan pelanggan aktif akan digantikan oleh data dari berkas cadangan ini.
              </p>

              {/* Side-by-side Overwrite Impact Matrix */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-rose-200 dark:border-rose-900/80 text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-400">
                    <span>Data Saat Ini</span>
                    <span className="text-[9px] bg-rose-100 dark:bg-rose-950/80 px-1 py-0.5 rounded font-semibold text-rose-800 dark:text-rose-300">
                      Akan Ditimpa
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 space-y-0.5 font-mono text-[10.5px]">
                    <div>• {products.length} Produk &amp; Stok</div>
                    <div>• {transactions.length} Riwayat Transaksi</div>
                    <div>• {customers.length} Pelanggan CRM</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-emerald-300 dark:border-emerald-800/80 text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-bold text-emerald-700 dark:text-emerald-400">
                    <span>Data Berkas Cadangan</span>
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 px-1 py-0.5 rounded font-semibold text-emerald-800 dark:text-emerald-300">
                      Pengganti
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 space-y-0.5 font-mono text-[10.5px]">
                    <div>• {confirmRestoreModal.validationReport?.metrics.validProductsCount ?? confirmRestoreModal.targetPayload?.summary.totalProducts ?? 0} Produk &amp; Stok</div>
                    <div>• {confirmRestoreModal.validationReport?.metrics.validTransactionsCount ?? confirmRestoreModal.targetPayload?.summary.totalTransactions ?? 0} Transaksi</div>
                    <div>• {confirmRestoreModal.validationReport?.metrics.validCustomersCount ?? confirmRestoreModal.targetPayload?.summary.totalCustomers ?? 0} Pelanggan CRM</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Verification Badge for File Restore */}
            {confirmRestoreModal.source === 'file' && confirmRestoreModal.validationReport && (
              <div className="p-3 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Lolos Verifikasi &amp; Audit Integritas</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                    {confirmRestoreModal.validationReport.fileInfo.fileName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  Asal Toko Berkas: <strong>{confirmRestoreModal.validationReport.fileInfo.storeName}</strong> ({confirmRestoreModal.validationReport.fileInfo.fileSize})
                </div>
              </div>
            )}

            {/* Mode Selection */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Pilih Mode Pemulihan:
              </span>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-rose-300 dark:hover:border-rose-800 transition-colors">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="overwrite"
                    checked={confirmRestoreModal.restoreMode === 'overwrite'}
                    onChange={() =>
                      setConfirmRestoreModal((prev) => ({ ...prev, restoreMode: 'overwrite' }))
                    }
                    className="mt-0.5 text-rose-600"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        Timpa Total (Full Overwrite)
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        Menimpa Data Aktif
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Mengosongkan dan menimpa seluruh data produk, stok, transaksi, dan customer saat ini secara penuh.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={confirmRestoreModal.restoreMode === 'merge'}
                    onChange={() =>
                      setConfirmRestoreModal((prev) => ({ ...prev, restoreMode: 'merge' }))
                    }
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        Gabungkan Data (Smart Merge)
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        Penggabungan
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Menambahkan data produk &amp; transaksi baru yang belum ada saat ini; data dengan ID sama akan diperbarui.
                    </span>
                  </div>
                </label>
              </div>

              {/* Safety Snapshot Checkbox */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmRestoreModal.autoSafetyPoint}
                    onChange={(e) =>
                      setConfirmRestoreModal((prev) => ({
                        ...prev,
                        autoSafetyPoint: e.target.checked,
                      }))
                    }
                    className="rounded text-emerald-600"
                  />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Buat Titik Pemulihan Cadangan Otomatis sebelum melakukan restore (Sangat Direkomendasikan)
                  </span>
                </label>
              </div>
            </div>

            {/* Explicit "Are You Sure?" Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 text-xs cursor-pointer select-none transition-colors hover:bg-amber-100/60 dark:hover:bg-amber-950/60">
              <input
                type="checkbox"
                checked={confirmRestoreModal.acknowledgedOverwrite}
                onChange={(e) =>
                  setConfirmRestoreModal((prev) => ({
                    ...prev,
                    acknowledgedOverwrite: e.target.checked,
                  }))
                }
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  Saya yakin dan memahami bahwa data yang ada saat ini akan ditimpa.
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block">
                  Saya menyetujui pemulihan data dan mengerti bahwa data aktif toko saat ini akan digantikan secara permanen oleh isi berkas cadangan ini.
                </span>
              </div>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {!confirmRestoreModal.acknowledgedOverwrite ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Centang pernyataan di atas untuk melanjutkan</span>
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Konfirmasi diterima</span>
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmRestoreModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!confirmRestoreModal.acknowledgedOverwrite}
                  onClick={handleExecuteRestore}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer transition-all active:scale-95"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Ya, Saya Yakin — Timpa &amp; Pulihkan Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE POINT OVERLAY DIALOG */}
      {confirmDeletePointId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                  Hapus Titik Pemulihan Ini?
                </h5>
                <p className="text-[11px] text-slate-500">
                  Snapshot ini akan dihapus dari daftar. Data aktif toko Anda tidak terpengaruh.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeletePointId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeletePoint(confirmDeletePointId)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Hapus Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON PREVIEW & CLIPBOARD MODAL */}
      {jsonPreviewModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-5 space-y-4 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Pratinjau Cadangan JSON
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono">{jsonPreviewModal.fileName}</span>
                    <span>•</span>
                    <span>{jsonPreviewModal.sizeKb} KB</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJsonPreviewModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Code container */}
            <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 p-3 font-mono text-[11px] leading-relaxed relative">
              <div className="overflow-auto max-h-[380px] select-all scrollbar-thin">
                <pre>{jsonPreviewModal.content.slice(0, 15000)}{jsonPreviewModal.content.length > 15000 ? '\n\n... [Data dipotong untuk pratinjau, unduh berkas untuk salinan lengkap 100%]' : ''}</pre>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-between gap-3 pt-1 shrink-0">
              <button
                type="button"
                onClick={handleCopyJsonToClipboard}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  hasCopiedJson
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200'
                }`}
              >
                {hasCopiedJson ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                    <span>Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Seluruh JSON</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setJsonPreviewModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCustomDownload();
                    setJsonPreviewModal((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <FolderDown className="w-4 h-4" />
                  <span>Unduh Berkas Ini (.json)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
