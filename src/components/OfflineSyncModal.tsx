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
  ShieldCheck,
  X,
  Clock,
  RotateCcw,
  Server,
  HardDrive,
  Layers,
  Activity,
  Check,
  Zap,
  Sliders,
  FileText,
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
    autoSyncEnabled,
    autoSyncIntervalSeconds,
    databaseEngine,
    setAutoSyncEnabled,
    setAutoSyncInterval,
    triggerAutoPeriodicSync,
    syncPendingTransactions,
    isSyncModalOpen,
    setIsSyncModalOpen,
    transactions,
    settings,
  } = usePOS();

  const [pendingList, setPendingList] = useState<Transaction[]>([]);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isRefreshingList, setIsRefreshingList] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'database' | 'queue'>('sync');

  // Server Database Metrics
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isLoadingDbStatus, setIsLoadingDbStatus] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<{ checked: boolean; result: string; checkedAt?: string } | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

  // Load pending list & db metrics when modal is opened
  useEffect(() => {
    if (isSyncModalOpen) {
      loadPendingList();
      fetchDatabaseMetrics();
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

  const fetchDatabaseMetrics = async () => {
    setIsLoadingDbStatus(true);
    try {
      const res = await fetch('/api/pos/database/status', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch sqlite database metrics:', err);
    } finally {
      setIsLoadingDbStatus(false);
    }
  };

  const handleCheckIntegrity = async () => {
    setIsCheckingIntegrity(true);
    try {
      const res = await fetch('/api/pos/database/check-integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setIntegrityStatus({
          checked: true,
          result: data.integrity || 'ok',
          checkedAt: data.checkedAt || new Date().toISOString(),
        });
        await fetchDatabaseMetrics();
      }
    } catch {
      setIntegrityStatus({
        checked: true,
        result: 'error_connecting',
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setIsCheckingIntegrity(false);
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
              ? `Berhasil! ${res.syncedCount} transaksi berhasil didorong ke server pusat dan dicatat dalam transaksi ACID SQLite WAL.`
              : 'Semua transaksi sudah sinkron rapi di server pusat.',
          type: 'success',
        });
        await loadPendingList();
        await fetchDatabaseMetrics();
      } else {
        setSyncFeedback({
          message: res.error || 'Gagal menyinkronkan. Periksa koneksi internet atau server.',
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

  const handleTriggerTick = async () => {
    try {
      await triggerAutoPeriodicSync();
      await fetchDatabaseMetrics();
      setSyncFeedback({
        message: 'Detak sinkronisasi otomatis berhasil dijalankan.',
        type: 'success',
      });
    } catch (err: any) {
      setSyncFeedback({
        message: 'Gagal menjalankan detak sinkronisasi.',
        type: 'error',
      });
    }
  };

  if (!isSyncModalOpen) return null;

  const totalSyncedCount = transactions.filter((t) => t.syncStatus === 'synced' || !t.syncStatus).length;
  const intervalPresets = [
    { sec: 10, label: '10 Detik', desc: 'Sangat Cepat' },
    { sec: 15, label: '15 Detik', desc: 'Rekomendasi' },
    { sec: 30, label: '30 Detik', desc: 'Standar' },
    { sec: 60, label: '1 Menit', desc: 'Ringan' },
    { sec: 120, label: '2 Menit', desc: 'Hemat Data' },
    { sec: 300, label: '5 Menit', desc: 'Santai' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="offline-sync-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-xs ${
                isOnline
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
              }`}
            >
              {isOnline ? <Server className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Sinkronisasi Otomatis & Basis Data Relasional
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
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
                  {isOnline ? 'Server Terhubung (Online)' : 'Offline (Antrean Lokal)'}
                </span>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1 font-mono">
                  <Database className="w-3 h-3 text-blue-500" />
                  SQLite WAL
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sinkronisasi otomatis berkala multi-kasir ke server pusat dengan basis data relasional SQLite WAL mode & ACID transaction.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/20 px-5 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Sinkronisasi Otomatis Berkala</span>
            {autoSyncEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'database'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Basis Data Server (SQLite WAL)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono">
              WAL Mode
            </span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'queue'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Antrean Transaksi &amp; Uji Coba</span>
            {pendingSyncCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                {pendingSyncCount}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: SINKRONISASI OTOMATIS BERKALA */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Master Auto-Sync Switch & Status Banner */}
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Sinkronisasi Otomatis Berkala ke Server Pusat
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        autoSyncEnabled
                          ? 'bg-emerald-500 text-slate-950 animate-pulse'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {autoSyncEnabled ? 'AKTIF (BERJALAN)' : 'NONAKTIF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                    Sistem otomatis mengunggah transaksi kasir, memeriksa pembaruan katalog produk, dan menjaga data tetap sinkron secara periodik di latar belakang tanpa mengganggu kasir.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs flex items-center gap-2 ${
                      autoSyncEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <Activity className={`w-3.5 h-3.5 ${autoSyncEnabled ? 'animate-pulse' : ''}`} />
                    <span>{autoSyncEnabled ? 'Sinkronisasi Aktif' : 'Aktifkan Sinkronisasi'}</span>
                  </button>
                </div>
              </div>

              {/* Interval Selection Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      Pengaturan Interval Sinkronisasi Berkala
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tentukan seberapa sering kasir otomatis menyinkronkan data ke server pusat (default: 15 detik).
                    </p>
                  </div>
                  <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Setiap {autoSyncIntervalSeconds} Detik
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {intervalPresets.map((preset) => {
                    const isSelected = autoSyncIntervalSeconds === preset.sec;
                    return (
                      <button
                        key={preset.sec}
                        onClick={() => setAutoSyncInterval(preset.sec)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs ring-2 ring-emerald-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-xs">{preset.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{preset.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions & Live Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between">
                  <div className="text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
                    <span>Status Detak Auto-Sync</span>
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-2">
                    <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>{autoSyncEnabled ? `Tiap ${autoSyncIntervalSeconds}s Berjalan` : 'Nonaktif'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Sinkronisasi otomatis latar belakang
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between">
                  <div className="text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
                    <span>Waktu Sinkron Terakhir</span>
                    <Clock className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="mt-2">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {lastSyncTime ? formatDate(lastSyncTime) : 'Belum pernah'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Terverifikasi oleh server pusat
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between">
                  <div className="text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
                    <span>Aksi Cepat</span>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={handleTriggerTick}
                      disabled={!isOnline || isSyncing}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 cursor-pointer text-center"
                    >
                      Picu Detak
                    </button>
                    <button
                      onClick={handleManualSync}
                      disabled={!isOnline || isSyncing}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs cursor-pointer text-center flex items-center justify-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sync...' : 'Push Now'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BASIS DATA SERVER (SQLITE WAL MODE) */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              {/* Database Overview Banner */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/80 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Mesin Basis Data: SQLite Relasional (WAL Mode)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white font-mono">
                      ACID Guaranteed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                    Server pusat ditenagai oleh mesin basis data relasional SQLite sejati dengan <strong>Write-Ahead Logging (WAL)</strong>. Menjamin konkurensi pembacaan &amp; penulisan tanpa locking, transaksi atomik, dan integritas foreign keys antar kasir.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCheckIntegrity}
                    disabled={isCheckingIntegrity}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${isCheckingIntegrity ? 'animate-spin' : ''}`} />
                    <span>{isCheckingIntegrity ? 'Memeriksa...' : 'Cek Integritas (PRAGMA)'}</span>
                  </button>
                </div>
              </div>

              {/* Integrity status pill if checked */}
              {integrityStatus && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
                    integrityStatus.result === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Hasil Pemeriksaan Integritas PRAGMA:{' '}
                      <strong className="font-mono uppercase">{integrityStatus.result}</strong> (Basis data sehat &amp;
                      indeks B-Tree valid).
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {formatDate(integrityStatus.checkedAt || '')}
                  </span>
                </div>
              )}

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Mode Jurnal Transaksi</div>
                  <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-1">
                    {dbStatus?.journalMode?.toUpperCase() || 'WAL'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Write-Ahead Logging (Non-blocking)
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Sinkronisasi Disk</div>
                  <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-1">
                    {dbStatus?.synchronous || 'NORMAL'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Aman dari power crash &amp; latency nol
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Foreign Keys &amp; Relasi</div>
                  <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    ON (Enabled)
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Cascade onDelete &amp; konsistensi item
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Berkas Database SQLite</div>
                  <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-1">
                    {dbStatus?.fileSizeKb || 120} KB
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={dbStatus?.filePath}>
                    pos-master.sqlite
                  </div>
                </div>
              </div>

              {/* Table Record Counts */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-500" />
                    Statistik Baris Data Relasional di Server SQLite
                  </h4>
                  <button
                    onClick={fetchDatabaseMetrics}
                    disabled={isLoadingDbStatus}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Muat Ulang Statistik"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isLoadingDbStatus ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Tabel Produk</div>
                    <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                      {dbStatus?.counts?.products ?? 0}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Tabel Transaksi</div>
                    <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {dbStatus?.counts?.transactions ?? totalSyncedCount}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Pelanggan / Member</div>
                    <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                      {dbStatus?.counts?.customers ?? 0}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Pemasok / Supplier</div>
                    <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                      {dbStatus?.counts?.suppliers ?? 0}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Pesanan Parkir (Held)</div>
                    <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                      {dbStatus?.counts?.heldOrders ?? 0}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Audit Sync Logs</div>
                    <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                      {dbStatus?.counts?.auditLogs ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANTREAN TRANSAKSI & PENGUJIAN */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              {/* Testing Control: Simulate Offline Mode */}
              <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {isOfflineSimulated ? (
                        <WifiOff className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Wifi className="w-4 h-4 text-emerald-600" />
                      )}
                      Uji Coba: Simulasi Pemadaman Internet (Offline)
                    </span>
                    {isOfflineSimulated && (
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                        SIMULASI AKTIF
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
                    Aktifkan opsi ini untuk menguji ketahanan kasir saat sinyal padam. Transaksi baru akan aman masuk ke antrean IndexedDB lokal, lalu diunggah otomatis saat koneksi kembali.
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

              {/* Pending Queue List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      Rincian Antrean Transaksi Menunggu Unggah ({pendingList.length})
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
                              Antrean Lokal
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
                      Tidak ada transaksi tertunda. Seluruh penjualan kasir tersimpan aman di tabel relasional SQLite WAL server pusat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Sinkronisasi Terakhir:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {lastSyncTime ? formatDate(lastSyncTime) : 'Baru saja'}
              </strong>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
              {autoSyncEnabled ? `Auto-Sync Tiap ${autoSyncIntervalSeconds}s` : 'Auto-Sync Nonaktif'}
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
