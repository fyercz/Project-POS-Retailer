import React from 'react';
import { Cloud, CloudOff, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { usePOS } from '../context/POSContext';

export const OfflineNotificationBanner: React.FC = () => {
  const {
    isOnline,
    isOfflineSimulated,
    pendingSyncCount,
    syncNotification,
    clearSyncNotification,
    setIsSyncModalOpen,
    syncPendingTransactions,
    isSyncing,
  } = usePOS();

  // 1. If there is a sync restored notification, show success toast
  if (syncNotification) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md z-40 animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{syncNotification}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="underline text-emerald-100 hover:text-white cursor-pointer text-[11px]"
          >
            Lihat Detail
          </button>
          <button
            onClick={clearSyncNotification}
            className="text-emerald-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. If offline, show persistent offline warning banner
  if (!isOnline) {
    return (
      <div
        id="offline-status-banner"
        className={`px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-xs border-b z-40 transition-colors ${
          isOfflineSimulated
            ? 'bg-purple-900/90 text-purple-100 border-purple-800'
            : 'bg-amber-500/90 text-slate-950 border-amber-600 font-semibold'
        }`}
      >
        <div className="flex items-center gap-2">
          <CloudOff className="w-4 h-4 shrink-0 animate-pulse" />
          <span>
            {isOfflineSimulated ? (
              <>
                <strong>Mode Simulasi Offline Aktif</strong> — Transaksi kasir disimpan aman di cache IndexedDB lokal.
              </>
            ) : (
              <>
                <strong>Koneksi Terputus (Mode Offline)</strong> — Transaksi kasir tetap berjalan lancar & tersimpan lokal.
              </>
            )}
            {pendingSyncCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-black/20 text-[10px] font-mono font-bold">
                {pendingSyncCount} transaksi di antrean lokal
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
              isOfflineSimulated
                ? 'bg-purple-800 hover:bg-purple-700 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300'
            }`}
          >
            Buka Panel Sync
          </button>
        </div>
      </div>
    );
  }

  return null;
};
