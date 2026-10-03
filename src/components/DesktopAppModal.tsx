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
  Tv,
  Cpu,
  Sparkles,
  X,
  Settings,
  HardDrive,
  Zap,
  GitBranch,
  RefreshCw,
  Copy,
  Check,
  FileCheck,
  Trash2,
  AlertTriangle,
  FolderSync,
  Database,
  Code,
  ShieldAlert,
  Archive,
  Layers,
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
  downloadUpdateBat,
  fetchGitStatus,
  triggerGitPull,
  configureGitRemote,
  verifySystemFiles,
  scanUnnecessaryFiles,
  executeSystemCleanup,
  GitStatusResponse,
  SystemVerificationResponse,
  CleanupScanResponse,
  CleanupExecuteResponse,
  DEFAULT_GITHUB_REPO_URL,
} from '../utils/desktopHelper';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'install' | 'kiosk' | 'hardware' | 'electron' | 'autoupdate' | 'verify' | 'cleanup';
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'install',
}) => {
  const [activeTab, setActiveTab] = useState<'install' | 'kiosk' | 'hardware' | 'electron' | 'autoupdate' | 'verify' | 'cleanup'>(initialTab);
  const [canInstallPwa, setCanInstallPwa] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [testPrintSuccess, setTestPrintSuccess] = useState<boolean>(false);
  const [drawerKickStatus, setDrawerKickStatus] = useState<string | null>(null);

  // GitHub Auto-Update states
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null);
  const [isLoadingGitStatus, setIsLoadingGitStatus] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [pullResult, setPullResult] = useState<{
    success: boolean;
    message: string;
    officialRepoUrl?: string;
    pullOutput?: string;
    buildOutput?: string;
    cleanedFilesCount?: number;
    cleanedBytesFreed?: number;
    details?: string;
  } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [isConfiguringGit, setIsConfiguringGit] = useState<boolean>(false);
  const [configureMsg, setConfigureMsg] = useState<string | null>(null);

  // Verification states
  const [verificationData, setVerificationData] = useState<SystemVerificationResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationCategoryFilter, setVerificationCategoryFilter] = useState<string>('all');

  // Cleanup states
  const [cleanupScanData, setCleanupScanData] = useState<CleanupScanResponse | null>(null);
  const [isScanningCleanup, setIsScanningCleanup] = useState<boolean>(false);
  const [isExecutingCleanup, setIsExecutingCleanup] = useState<boolean>(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupExecuteResponse | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

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

  const loadGitStatus = async () => {
    setIsLoadingGitStatus(true);
    try {
      const status = await fetchGitStatus();
      setGitStatus(status);
    } catch {
      // Ignored
    } finally {
      setIsLoadingGitStatus(false);
    }
  };

  const handleRunVerification = async () => {
    setIsVerifying(true);
    try {
      const res = await verifySystemFiles();
      setVerificationData(res);
    } catch {
      // Ignored
    } finally {
      setIsVerifying(false);
    }
  };

  const handleScanCleanup = async () => {
    setIsScanningCleanup(true);
    setCleanupResult(null);
    try {
      const res = await scanUnnecessaryFiles();
      setCleanupScanData(res);
    } catch {
      // Ignored
    } finally {
      setIsScanningCleanup(false);
    }
  };

  const handleExecuteCleanup = async () => {
    setIsExecutingCleanup(true);
    try {
      const res = await executeSystemCleanup();
      setCleanupResult(res);
      // Re-scan after cleanup to reflect empty list
      const updatedScan = await scanUnnecessaryFiles();
      setCleanupScanData(updatedScan);
      // Also refresh verification
      await handleRunVerification();
    } catch (err: any) {
      setCleanupResult({
        success: false,
        deletedCount: 0,
        bytesFreed: 0,
        deletedList: [],
        message: 'Gagal menjalankan pembersihan: ' + (err?.message || String(err)),
      });
    } finally {
      setIsExecutingCleanup(false);
    }
  };

  const handleConfigureGitOrigin = async () => {
    setIsConfiguringGit(true);
    setConfigureMsg(null);
    try {
      const res = await configureGitRemote();
      setConfigureMsg(res.message);
      await loadGitStatus();
    } catch (err: any) {
      setConfigureMsg('Gagal: ' + (err?.message || String(err)));
    } finally {
      setIsConfiguringGit(false);
      setTimeout(() => setConfigureMsg(null), 5000);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'autoupdate') {
      loadGitStatus();
    } else if (activeTab === 'verify') {
      if (!verificationData && !isVerifying) {
        handleRunVerification();
      }
    } else if (activeTab === 'cleanup') {
      if (!cleanupScanData && !isScanningCleanup) {
        handleScanCleanup();
      }
    }
  }, [isOpen, activeTab]);

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

  const handlePullFromGit = async () => {
    setIsPulling(true);
    setPullResult(null);
    try {
      const res = await triggerGitPull();
      setPullResult(res);
      if (res.success) {
        await loadGitStatus();
        await handleRunVerification();
      }
    } catch (err: any) {
      setPullResult({
        success: false,
        message: 'Terjadi kesalahan saat memproses update.',
        details: err?.message,
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  // Filtered files for verification tab
  const filteredFiles = verificationData?.files.filter((file) => {
    if (verificationCategoryFilter === 'all') return true;
    return file.category === verificationCategoryFilter;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur-xs shadow-inner">
              <Monitor className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Pusat Aplikasi Desktop &amp; Pemeliharaan Sistem</h3>
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
                Auto-update GitHub resmi, verifikasi integritas file sistem, pembersihan file sampah, dan integrasi desktop kasir
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
            onClick={() => setActiveTab('autoupdate')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'autoupdate'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
            <span>Auto-Update GitHub</span>
            {gitStatus?.hasUpdate && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'verify'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>Verifikasi File Sistem</span>
            {verificationData?.stats.missingCritical ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            ) : null}
          </button>

          <button
            onClick={() => setActiveTab('cleanup')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'cleanup'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Bersihkan File Sampah</span>
            {(cleanupScanData?.totalFiles ?? 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                {cleanupScanData?.totalFiles}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'install'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Pasang di Desktop</span>
          </button>

          <button
            onClick={() => setActiveTab('kiosk')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'kiosk'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Mode Kiosk</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-2.5 rounded-t-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'hardware'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printer &amp; Laci</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB: GITHUB AUTO-UPDATE */}
          {activeTab === 'autoupdate' && (
            <div className="space-y-4">
              {/* Repository Official Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Repositori Resmi GitHub Toko
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        main branch
                      </span>
                    </div>
                    <a
                      href="https://github.com/fyercz/Project-POS-Retailer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>https://github.com/fyercz/Project-POS-Retailer.git</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadGitStatus}
                    disabled={isLoadingGitStatus}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGitStatus ? 'animate-spin' : ''}`} />
                    <span>{isLoadingGitStatus ? 'Memeriksa...' : 'Periksa GitHub'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfigureGitOrigin}
                    disabled={isConfiguringGit}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Pastikan remote origin tertuju ke repositori resmi"
                  >
                    <FolderSync className={`w-3.5 h-3.5 ${isConfiguringGit ? 'animate-spin' : ''}`} />
                    <span>Sinkronkan Origin</span>
                  </button>
                </div>
              </div>

              {configureMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{configureMsg}</span>
                </div>
              )}

              {/* Data Security Guarantee Notice */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong>Jaminan Keamanan Data Toko 100%:</strong> Seluruh riwayat transaksi kasir, katalog produk ritel, stok opname, dan laporan keuangan tersimpan di basis data lokal browser (IndexedDB). Menjalankan <code>git pull</code>, pembersihan cache, atau update kode <strong>TIDAK AKAN PERNAH MENGHAPUS ATAU MERUBAH DATA TOKO ANDA</strong>.
                </div>
              </div>

              {/* Status Info Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="text-sm">Status Sinkronisasi Git &amp; GitHub:</span>
                  {gitStatus?.isUpToDate ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Versi Terbaru (Up-to-Date)
                    </span>
                  ) : gitStatus?.hasUpdate ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Tersedia Pembaruan Baru di GitHub!
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Git Aktif
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Branch Aktif:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {gitStatus?.branch || 'main'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Commit Lokal:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {gitStatus?.currentCommit ? `${gitStatus.currentCommit} (${gitStatus.commitDate || 'saat ini'})` : '-'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Commit Terbaru GitHub:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      {gitStatus?.remoteLatestCommit || gitStatus?.currentCommit || 'ea2575b'}
                    </span>
                  </div>
                </div>

                {gitStatus?.commitMessage && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pesan Terakhir:</span>
                    <span className="italic text-slate-700 dark:text-slate-300">
                      &ldquo;{gitStatus.commitMessage}&rdquo;
                    </span>
                  </div>
                )}
              </div>

              {/* 1-Click Update Action */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Tarik Pembaruan Langsung (1-Klik via Server Kasir)</span>
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Otomatis membersihkan file sampah, melakukan <code>git pull origin main</code> dari <span className="font-mono text-emerald-600">fyercz/Project-POS-Retailer</span>, dan mengompilasi ulang <code>npm run build</code>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handlePullFromGit}
                    disabled={isPulling}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all shrink-0 active:scale-95"
                  >
                    <RefreshCw className={`w-4 h-4 ${isPulling ? 'animate-spin' : ''}`} />
                    <span>{isPulling ? 'Menarik Kode & Memperbarui...' : 'Tarik Update Sekarang'}</span>
                  </button>
                </div>

                {/* Pull Result Output */}
                {pullResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                      pullResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {pullResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        )}
                        <span>{pullResult.message}</span>
                      </div>
                      {pullResult.cleanedFilesCount ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60">
                          {pullResult.cleanedFilesCount} file sampah dibersihkan
                        </span>
                      ) : null}
                    </div>

                    {pullResult.pullOutput && (
                      <pre className="p-2.5 rounded-lg bg-slate-950 text-slate-200 font-mono text-[10px] overflow-x-auto max-h-36">
                        {pullResult.pullOutput}
                      </pre>
                    )}
                    {pullResult.details && (
                      <div className="text-[11px] opacity-90">Detail: {pullResult.details}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Script Download & CLI Methods */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Method A: File update.bat */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-blue-500" />
                      <span>Script update.bat (Windows)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      File batch otomatis untuk Windows. Sudah disetel ke repositori resmi dan otomatis membersihkan file sampah serta mengompilasi ulang.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadUpdateBat}
                    className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh update.bat (Resmi)</span>
                  </button>
                </div>

                {/* Method B: Perintah Terminal Manual */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-indigo-500" />
                      <span>Perintah CLI Terminal Manual</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Jalankan perintah ini di Command Prompt atau PowerShell kasir:
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px]">
                    <span className="truncate mr-2">git pull origin main && npm i && npm run build</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          'git remote set-url origin https://github.com/fyercz/Project-POS-Retailer.git && git pull origin main && npm install && npm run build',
                          'cmd_git'
                        )
                      }
                      className="p-1 hover:bg-slate-800 text-slate-300 rounded cursor-pointer shrink-0"
                      title="Salin Perintah"
                    >
                      {copiedCmd === 'cmd_git' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: VERIFIKASI FILE SISTEM */}
          {activeTab === 'verify' && (
            <div className="space-y-4">
              {/* Header and Action Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 dark:border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Verifikasi Integritas File &amp; Kesehatan Sistem POS
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Memeriksa keberadaan file sistem inti, keutuhan kode sumber, skrip launcher desktop, aset PWA, dan konektivitas basis data lokal.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunVerification}
                  disabled={isVerifying}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20 disabled:opacity-50 transition shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>{isVerifying ? 'Memverifikasi...' : 'Verifikasi Ulang Sekarang'}</span>
                </button>
              </div>

              {/* Health Score Summary Card */}
              {verificationData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div
                    className={`p-3 rounded-xl border flex flex-col justify-between ${
                      verificationData.overallHealth === 'healthy'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : verificationData.overallHealth === 'warning'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                      Status Integritas
                    </span>
                    <span className="text-base font-extrabold flex items-center gap-1.5 mt-1">
                      {verificationData.overallHealth === 'healthy' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>100% Lengkap</span>
                        </>
                      ) : verificationData.overallHealth === 'warning' ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span>Perlu Perhatian</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4 text-rose-500" />
                          <span>Kritis</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      File Utuh &amp; Valid
                    </span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-200 block mt-1">
                      {verificationData.stats.intact} / {verificationData.stats.total} File
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Dimodifikasi Lokal
                    </span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400 block mt-1">
                      {verificationData.stats.modified} File
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      File Hilang
                    </span>
                    <span
                      className={`text-base font-bold block mt-1 ${
                        verificationData.stats.missing > 0 ? 'text-rose-500' : 'text-emerald-500'
                      }`}
                    >
                      {verificationData.stats.missing} File
                    </span>
                  </div>
                </div>
              )}

              {/* Environment Diagnostics Checklist */}
              {verificationData?.envPrerequisites && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                    Pemeriksaan Lingkungan Sistem (Prerequisites):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">Node.js Runtime</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {verificationData.envPrerequisites.nodeVersion}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">Git CLI</span>
                      <span
                        className={`font-bold ${
                          verificationData.envPrerequisites.gitInstalled ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {verificationData.envPrerequisites.gitInstalled ? 'Terpasang' : 'Tidak Ada'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">Node Modules</span>
                      <span
                        className={`font-bold ${
                          verificationData.envPrerequisites.nodeModulesInstalled ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {verificationData.envPrerequisites.nodeModulesInstalled ? 'Lengkap' : 'Perlu npm i'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">Database Toko</span>
                      <span
                        className={`font-bold ${
                          verificationData.envPrerequisites.databaseAccessible ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {verificationData.envPrerequisites.databaseAccessible ? 'Siap' : 'Belum Ada'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'Semua Kategori' },
                  { id: 'Core Runtime', label: 'Core Runtime' },
                  { id: 'Source Code', label: 'Source Code UI' },
                  { id: 'Skrip Desktop & Auto-Update', label: 'Skrip Desktop' },
                  { id: 'PWA & Aset', label: 'PWA & Aset' },
                  { id: 'Database & Data Toko', label: 'Database' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setVerificationCategoryFilter(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium text-[11px] whitespace-nowrap cursor-pointer transition ${
                      verificationCategoryFilter === cat.id
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* File Verification Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold sticky top-0">
                      <tr>
                        <th className="p-2.5">File Sistem</th>
                        <th className="p-2.5">Kategori &amp; Fungsi</th>
                        <th className="p-2.5">Ukuran</th>
                        <th className="p-2.5">Status Integritas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {filteredFiles.map((file) => (
                        <tr key={file.path} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            {file.category.includes('Skrip') ? (
                              <Terminal className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            ) : file.category.includes('Database') ? (
                              <Database className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            ) : (
                              <Code className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                            <span className="truncate">{file.path}</span>
                          </td>
                          <td className="p-2.5 font-sans text-slate-500 dark:text-slate-400 text-[11px]">
                            <div>{file.description}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{file.category}</span>
                          </td>
                          <td className="p-2.5 text-slate-500 text-[10px]">
                            {file.exists ? `${(file.size / 1024).toFixed(1)} KB` : '-'}
                          </td>
                          <td className="p-2.5">
                            {file.status === 'ok' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                Valid / Utuh
                              </span>
                            ) : file.status === 'modified' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                <FileCheck className="w-3 h-3" />
                                Termodifikasi Lokal
                              </span>
                            ) : file.status === 'untracked' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                File Baru Lokal
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                <AlertTriangle className="w-3 h-3" />
                                File Hilang
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PEMBERSIHAN FILE SAMPAH & TIDAK PERLU */}
          {activeTab === 'cleanup' && (
            <div className="space-y-4">
              {/* Header Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-rose-500/20 dark:border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Pembersihan File yang Tidak Perlu pada Sistem
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Pindai dan hapus file sampah, cache kompilasi kedaluwarsa, file temporary (*.tmp, *.bak, *.swp), file log debugging (*.log), serta metadata sistem operasi (.DS_Store, Thumbs.db).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleScanCleanup}
                    disabled={isScanningCleanup}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningCleanup ? 'animate-spin' : ''}`} />
                    <span>{isScanningCleanup ? 'Memindai...' : 'Pindai Sampah'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteCleanup}
                    disabled={isExecutingCleanup || !cleanupScanData || cleanupScanData.totalFiles === 0}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-40 transition active:scale-95"
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${isExecutingCleanup ? 'animate-spin' : ''}`} />
                    <span>{isExecutingCleanup ? 'Membersihkan...' : 'Bersihkan File Sekarang'}</span>
                  </button>
                </div>
              </div>

              {/* Safety Shield */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                  <strong>Pembersihan Aman Terproteksi:</strong> Modul pembersihan hanya menghapus berkas residu sementara. Berkas kode sumber (<code>src/</code>), repositori Git (<code>.git</code>), basis data lokal (<code>IndexedDB</code> &amp; <code>data/</code>), dan konfigurasi (<code>package.json</code>) dilindungi secara mutlak dan tidak akan tersentuh.
                </div>
              </div>

              {/* Result Notice after Cleaning */}
              {cleanupResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    cleanupResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-bold">{cleanupResult.message}</span>
                </div>
              )}

              {/* Scan Results Card */}
              {cleanupScanData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        File Sampah Ditemukan
                      </span>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                        {cleanupScanData.totalFiles} Berkas
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Archive className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                        Ruang yang Dapat Dibebaskan
                      </span>
                      <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        {(cleanupScanData.totalBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <HardDrive className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              )}

              {/* List of Scanned Junk Files */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Daftar File yang Teridentifikasi Tidak Diperlukan:</span>
                  <span className="text-[11px] font-mono text-slate-500 font-normal">
                    {cleanupScanData?.items.length || 0} item
                  </span>
                </div>

                <div className="overflow-y-auto max-h-60 divide-y divide-slate-100 dark:divide-slate-800">
                  {cleanupScanData && cleanupScanData.items.length > 0 ? (
                    cleanupScanData.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                            {item.relativePath}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {item.category}
                          </span>
                          <span className="font-mono text-slate-400">
                            {(item.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        Sistem POS Bersih!
                      </p>
                      <p className="text-[11px] mt-0.5">
                        Tidak ditemukan file sampah sementara, log usang, atau cache yang tidak perlu.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: INSTALL DESKTOP APP */}
          {activeTab === 'install' && (
            <div className="space-y-4">
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

              {/* Options */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pilihan Menjalankan sebagai Aplikasi Desktop
                </h4>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-xs">
                        1
                      </span>
                      <span>Instal PWA Desktop (Chrome, Edge, Brave, Safari)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Klik ikon instal di bilah browser (di sebelah bookmark) atau tekan tombol di bawah ini. Aplikasi akan langsung muncul di desktop dan menu Start Windows sebagai program tersendiri.
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
                      💡 <strong>Petunjuk Manual:</strong> Pada Google Chrome atau Microsoft Edge, klik titik tiga menu &rarr; pilih <strong>"Simpan &amp; bagikan"</strong> &rarr; pilih <strong>"Instal situs ini sebagai aplikasi"</strong>.
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">
                        2
                      </span>
                      <span>Peluncur Berkas Desktop Mandiri (.BAT / .SH)</span>
                    </div>
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
                      <span>Unduh Launcher Kiosk (.bat)</span>
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

                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                      <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs">
                        3
                      </span>
                      <span>Autorun Kasir (Saat Komputer Dinyalakan)</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Sistem <strong>Autorun</strong> lengkap untuk toko fisik. Cukup klik ganda <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono text-[11px]">autorun.bat</code> untuk auto-boot kasir setiap pagi!
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => downloadAutorunBat()}
                      className="px-3.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh autorun.bat</span>
                    </button>
                    <button
                      onClick={() => downloadSetupStartupBat()}
                      className="px-3.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-600" />
                      <span>Unduh setup-autorun-startup.bat</span>
                    </button>
                    <button
                      onClick={() => downloadAutorunInf()}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Unduh autorun.inf</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KIOSK MODE */}
          {activeTab === 'kiosk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Mode Kasir Kiosk (Layar Penuh Tanpa Batas)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Mengunci tampilan ke layar penuh untuk mencegah kasir membuka tab lain saat antrean transaksi.
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
                      Seluruh layar didedikasikan untuk katalog produk dan keranjang kasir.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Tombol Pintas (Hotkeys)
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tekan tombol <strong>F11</strong> kapan saja untuk masuk atau keluar dari mode layar penuh.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cashier Shortcuts */}
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
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HARDWARE */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Printer className="w-4 h-4 text-blue-500" />
                  <span>Integrasi Printer Kasir Thermal (58mm / 80mm)</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Mendukung pencetakan langsung ke printer kasir thermal USB, Bluetooth, ataupun Network (LAN) dengan layout yang dioptimasi untuk struk belanja.
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

              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Tips Mode Cetak Senyap (Silent Direct Printing)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Gunakan flag <code>--kiosk-printing</code> agar struk langsung dicetak tanpa menampilkan dialog popup browser:
                </p>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  chrome.exe --kiosk --kiosk-printing http://localhost:3000
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sistem POS Offline-First: Beroperasi penuh dengan keamanan data lokal 100%.</span>
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
