import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Database,
  ArrowUpRight,
  ShieldCheck,
  Smartphone,
  X,
  Clock,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { usePOS } from '../context/POSContext';
import { offlineSyncManager } from '../utils/offlineSyncManager';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export const OfflineSyncModal: React.FC = () => {
  const {
    isOnline,
    isOfflineSimulated,
    toggleOfflineSimulation,
    pendingSyncCount,
    isSyncing,
    lastSyncTime,
    serviceWorkerActive,
    backgroundSyncSupported,
    syncPendingTransactions,
    isSyncModalOpen,
    setIsSyncModalOpen,
    transactions,
    settings,
  } = usePOS();

  const [pendingList, setPendingList] = useState<Transaction[]>([]);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isRefreshingList, setIsRefreshingList] = useState(false);

  // Load pending list when modal is opened or count changes
  useEffect(() => {
    if (isSyncModalOpen) {
      loadPendingList();
    }
  }, [isSyncModalOpen, pendingSyncCount]);

  const loadPendingList = async () => {
    setIsRefreshingList(true);
    try {
      const items = await offlineSyncManager.getPendingTransactions();
      setPendingList(items);
    } catch {
      setPendingList([]);
    } finally {
      setIsRefreshingList(false);
    }
  };

  const handleManualSync = async () => {
    setSyncFeedback(null);
    try {
      const res = await syncPendingTransactions();
      if (res.success) {
        setSyncFeedback({
          message:
            res.syncedCount > 0
              ? `Berhasil! ${res.syncedCount} transaksi berhasil didorong dan diverifikasi ke cloud server.`
              : 'Semua transaksi sudah tersinkron rapi di cloud.',
          type: 'success',
        });
        await loadPendingList();
      } else {
        setSyncFeedback({
          message: res.error || 'Gagal menyinkronkan. Periksa koneksi internet Anda.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        message: err.message || 'Terjadi kesalahan saat sinkronisasi.',
        type: 'error',
      });
    }
  };

  if (!isSyncModalOpen) return null;

  const totalSyncedCount = transactions.filter((t) => t.syncStatus === 'synced' || !t.syncStatus).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="offline-sync-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                isOnline
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
              }`}
            >
              {isOnline ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Pusat Sinkronisasi Offline & Cloud
                </h2>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isOnline
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {isOnline ? 'Internet Terhubung (Cloud Aktif)' : 'Mode Offline (Penyimpanan Lokal)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Service Worker & Background Sync memastikan transaksi kasir tidak pernah hilang saat offline.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Status Alert feedback */}
          {syncFeedback && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 animate-in fade-in duration-150 ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
              }`}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold">{syncFeedback.message}</span>
              </div>
              <button
                onClick={() => setSyncFeedback(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1: Pending Transactions */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="font-medium">Antrean Offline Lokal</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white flex items-center gap-1.5">
                  {pendingSyncCount}
                  {pendingSyncCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tersimpan di IndexedDB browser
                </p>
              </div>
            </div>

            {/* Metric 2: Synced Cloud Transactions */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="font-medium">Tersinkron di Cloud</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {totalSyncedCount}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tercatat aman di server pusat
                </p>
              </div>
            </div>

            {/* Metric 3: Background Sync Technology */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="font-medium">Status PWA & Sync</span>
                <ShieldCheck className="w-4 h-4 text-teal-500" />
              </div>
              <div className="mt-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Service Worker Aktif
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {backgroundSyncSupported ? 'Background Sync API didukung' : 'Sync otomatis via listener jaringan'}
                </p>
              </div>
            </div>
          </div>

          {/* Testing Control: Simulate Offline Mode */}
          <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {isOfflineSimulated ? <WifiOff className="w-4 h-4 text-amber-600" /> : <Wifi className="w-4 h-4 text-emerald-600" />}
                  Uji Coba: Simulasi Mode Offline
                </span>
                {isOfflineSimulated && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                    SIMULASI AKTIF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                Aktifkan opsi ini untuk menguji perilaku kasir saat internet padam. Transaksi baru akan otomatis masuk ke antrean lokal browser, lalu diunggah saat simulasi dinonaktifkan.
              </p>
            </div>

            <button
              id="btn-toggle-offline-simulation"
              onClick={() => toggleOfflineSimulation()}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 flex items-center gap-2 ${
                isOfflineSimulated
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs'
              }`}
            >
              {isOfflineSimulated ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span>Pulihkan Koneksi (Online)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>Simulasikan Putus Koneksi</span>
                </>
              )}
            </button>
          </div>

          {/* Pending Queue Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Rincian Transaksi Menunggu Unggah ({pendingList.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadPendingList}
                  disabled={isRefreshingList}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Muat Ulang Antrean"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isRefreshingList ? 'animate-spin' : ''}`} />
                </button>

                <button
                  id="btn-trigger-cloud-sync"
                  onClick={handleManualSync}
                  disabled={isSyncing || pendingList.length === 0 || !isOnline}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>
            </div>

            {pendingList.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 max-h-56 overflow-y-auto">
                {pendingList.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {tx.invoiceNumber}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Offline Lokal
                        </span>
                        {tx.syncRetryCount && tx.syncRetryCount > 0 ? (
                          <span className="text-[10px] text-rose-500">
                            (Percobaan ke-{tx.syncRetryCount})
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <span>{tx.items.length} item barang</span>
                        <span>•</span>
                        <span>{formatDate(tx.createdAt)}</span>
                        <span>•</span>
                        <span>{tx.cashierName}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900 dark:text-emerald-400">
                        {formatCurrency(tx.finalTotal, settings.currency)}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {tx.payment.method}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Semua Transaksi Sudah Tersinkronkan!
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] max-w-sm mx-auto">
                  Tidak ada transaksi kasir yang tertahan di antrean lokal. Seluruh transaksi kasir Anda telah aman tercatat di cloud database.
                </p>
              </div>
            )}
          </div>

          {/* Educational Note on Background Sync Architecture */}
          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-500" />
              Bagaimana Mekanisme Offline & Background Sync Bekerja?
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Saat sinyal internet hilang, kasir tetap dapat memproses penjualan tanpa henti. Setiap transaksi dienkripsi dan disimpan secara instan di <strong className="text-slate-900 dark:text-slate-200">IndexedDB</strong> browser kasir. Begitu jaringan internet terdeteksi pulih, Service Worker menjalankan <strong className="text-slate-900 dark:text-slate-200">Background Sync</strong> untuk mengunggah seluruh antrean ke cloud secara otomatis di latar belakang tanpa mengganggu transaksi kasir yang sedang berlangsung.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Sinkronisasi Terakhir:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {lastSyncTime ? formatDate(lastSyncTime) : 'Baru saja'}
              </strong>
            </span>
          </div>

          <button
            onClick={() => setIsSyncModalOpen(false)}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
