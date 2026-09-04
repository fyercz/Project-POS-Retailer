import React from 'react';
import { Cloud, CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { usePOS } from '../context/POSContext';

export const OfflineSyncBadge: React.FC = () => {
  const {
    isOnline,
    isOfflineSimulated,
    pendingSyncCount,
    isSyncing,
    setIsSyncModalOpen,
  } = usePOS();

  return (
    <button
      id="btn-open-sync-modal"
      onClick={() => setIsSyncModalOpen(true)}
      className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 ${
        isOfflineSimulated
          ? 'border-purple-400/80 bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:border-purple-700/80 dark:text-purple-300'
          : !isOnline
          ? 'border-amber-400/80 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:border-amber-700/80 dark:text-amber-300'
          : pendingSyncCount > 0 || isSyncing
          ? 'border-blue-400/80 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:border-blue-700/80 dark:text-blue-300'
          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
      title={
        isOfflineSimulated
          ? 'Mode Simulasi Offline Aktif (Klik untuk Pengaturan Sync)'
          : !isOnline
          ? 'Internet Terputus - Transaksi Tersimpan Lokal (Klik untuk Sync)'
          : pendingSyncCount > 0
          ? `${pendingSyncCount} transaksi menunggu sinkronisasi cloud`
          : 'Cloud Aktif & Tersinkronkan'
      }
    >
      {isSyncing ? (
        <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
      ) : isOfflineSimulated ? (
        <WifiOff className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
      ) : !isOnline ? (
        <CloudOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
      ) : (
        <Cloud className="w-3.5 h-3.5 text-emerald-500" />
      )}

      <span className="hidden sm:inline">
        {isSyncing
          ? 'Sinkron...'
          : isOfflineSimulated
          ? 'Uji Offline'
          : !isOnline
          ? 'Mode Offline'
          : 'Cloud Sync'}
      </span>

      {pendingSyncCount > 0 ? (
        <span
          className={`w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center font-mono ${
            !isOnline
              ? 'bg-amber-500 text-slate-950'
              : 'bg-blue-500 text-white'
          }`}
        >
          {pendingSyncCount}
        </span>
      ) : isOnline && !isOfflineSimulated ? (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      ) : null}
    </button>
  );
};
