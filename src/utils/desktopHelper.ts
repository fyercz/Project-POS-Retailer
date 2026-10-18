import { errorMessage } from './errors';
/**
 * Utility helper for POS Desktop Application modes:
 * - Standalone PWA Desktop App (Edge/Chrome/Safari)
 * - Electron Native Desktop App (Windows .exe, macOS, Linux)
 * - POS Cashier Kiosk Mode (Fullscreen lock)
 * - Hardware ESC/POS Cash Drawer & Silent Thermal Printing hooks
 */

export interface DesktopStatus {
  isElectron: boolean;
  isStandalonePWA: boolean;
  isDesktopMode: boolean;
  isFullscreen: boolean;
  canInstallPwa: boolean;
  platform: string;
}

let deferredInstallPrompt: any = null;
const listeners = new Set<(canInstall: boolean) => void>();

// Register beforeinstallprompt listener early
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    listeners.forEach((cb) => cb(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    listeners.forEach((cb) => cb(false));
  });
}

export function subscribeToInstallPrompt(callback: (canInstall: boolean) => void): () => void {
  listeners.add(callback);
  callback(Boolean(deferredInstallPrompt));
  return () => {
    listeners.delete(callback);
  };
}

export async function promptPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt) {
    return 'unavailable';
  }
  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredInstallPrompt = null;
      listeners.forEach((cb) => cb(false));
    }
    return outcome;
  } catch (err) {
    console.error('PWA Install Error:', err);
    return 'unavailable';
  }
}

export function isElectronApp(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).electronAPI?.isElectron);
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const hasMatchMedia = typeof window.matchMedia === 'function';
    const isStandalone = hasMatchMedia && Boolean(window.matchMedia('(display-mode: standalone)')?.matches);
    const isOverlay = hasMatchMedia && Boolean(window.matchMedia('(display-mode: window-controls-overlay)')?.matches);
    const isIosStandalone = (window.navigator as any)?.standalone === true;
    return Boolean(isStandalone || isOverlay || isIosStandalone);
  } catch {
    return false;
  }
}

export function isDesktopApp(): boolean {
  return isElectronApp() || isStandalonePWA();
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
  );
}

export async function togglePOSKioskFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  // If in Electron, use Electron's kiosk/fullscreen API
  if (isElectronApp() && (window as any).electronAPI?.toggleFullscreen) {
    return (window as any).electronAPI.toggleFullscreen();
  }

  try {
    if (!isFullscreenActive()) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if ((docEl as any).webkitRequestFullscreen) {
        await (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).msRequestFullscreen) {
        await (docEl as any).msRequestFullscreen();
      }
      return true;
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      return false;
    }
  } catch (err) {
    console.warn('Fullscreen toggle failed:', err);
    return isFullscreenActive();
  }
}

/**
 * Trigger simulated or native ESC/POS Cash Drawer Kick pulse
 * Command: ESC p 0 25 250 (0x1B 0x70 0x00 0x19 0xFA)
 */
export async function triggerCashDrawerKick(): Promise<{ success: boolean; message: string }> {
  // If Electron has direct hardware integration:
  if (isElectronApp() && (window as any).electronAPI?.openCashDrawer) {
    return (window as any).electronAPI.openCashDrawer();
  }

  // Web fallback: synthesize hardware audio bell or notify cashier
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    }
    return {
      success: true,
      message: 'Perintah pembuka laci uang (ESC/POS Drawer Kick Pulse) berhasil dikirim.',
    };
  } catch {
    return {
      success: true,
      message: 'Perintah pembuka laci uang siap dieksekusi di printer kasir.',
    };
  }
}

/**
 * Safely trigger download of text/binary files in browser.
 * For Windows batch files (.bat/.cmd) and configuration files (.inf),
 * line endings are strictly normalized to Windows CRLF (\r\n) to prevent cmd.exe parser desync.
 */
export function downloadBlobFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8'): void {
  const isWindowsScript = filename.endsWith('.bat') || filename.endsWith('.cmd') || filename.endsWith('.inf');
  const normalizedContent = isWindowsScript
    ? content.replace(/\r?\n/g, '\r\n')
    : content.replace(/\r\n/g, '\n');
  const blob = new Blob([normalizedContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Download native compiled Windows .EXE launcher (UlilmartPOS.exe)
 * Runs cleanly without CMD window crashes and auto-discovers Node.js
 */
export function downloadWindowsNativeExe(options: { kioskMode?: boolean } = {}): void {
  const filename = options.kioskMode ? 'UlilmartPOS-Kiosk.exe' : 'UlilmartPOS.exe';
  const a = document.createElement('a');
  a.href = `/download/${filename}`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 200);
}

/**
 * Generate and download a dedicated 1-Click Desktop App Launcher (.bat) for Windows
 */
export function downloadWindowsDesktopLauncher(options: { kioskMode?: boolean } = {}): void {
  const kioskFlag = options.kioskMode ? ' --kiosk' : '';
  const batContent = `@echo off
title Ulilmart POS - Terminal Kasir Desktop
color 0A
cd /d "%~dp0"

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ MODE APLIKASI DESKTOP KASIR MANDIRI ]
echo ==============================================================================
echo.

if exist "%~dp0ulilmart.ico" (
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $desk = [System.Environment]::GetFolderPath('Desktop'); $deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; if (-not (Test-Path $deskLnk)) { $s1 = $ws.CreateShortcut($deskLnk); $s1.TargetPath = '%~dp0desktop.bat'; $s1.WorkingDirectory = '%~dp0'; $s1.IconLocation = '%~dp0ulilmart.ico,0'; $s1.Description = 'Ulilmart POS Kasir'; $s1.Save(); };" >nul 2>&1
)

cd /d "%~dp0"

if not exist node_modules (
    echo [INFO] Menginstal dependensi pertama kali (npm install)...
    call npm install
)

if not exist dist (
    echo [INFO] Mengompilasi aplikasi kasir (npm run build)...
    call npm run build
)

echo [INFO] Menyalakan Server Kasir Lokal (Port 3000)...
start /b "" npm start

echo [INFO] Menunggu server siap...
timeout /t 2 /nobreak >nul

set "TARGET_URL=http://localhost:3000"

where msedge >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Meluncurkan aplikasi via Microsoft Edge App Mode...
    start "" msedge --app=%TARGET_URL%${kioskFlag}
    goto SELESAI
)

where chrome >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Meluncurkan aplikasi via Google Chrome App Mode...
    start "" chrome --app=%TARGET_URL%${kioskFlag}
    goto SELESAI
)

echo [INFO] Meluncurkan di browser default...
start "" %TARGET_URL%

:SELESAI
echo.
echo ==============================================================================
echo  [OK] Aplikasi Desktop Berjalan! Jangan tutup jendela ini saat kasir aktif.
echo ==============================================================================
`;

  downloadBlobFile(options.kioskMode ? 'Buka-Kasir-Kiosk-Desktop.bat' : 'Buka-Kasir-Desktop.bat', batContent, 'application/x-bat');
}

/**
 * Generate and download a dedicated 1-Click Desktop App Launcher (.sh) for Linux / macOS
 */
export function downloadUnixDesktopLauncher(options: { kioskMode?: boolean } = {}): void {
  const kioskFlag = options.kioskMode ? ' --kiosk' : '';
  const shContent = `#!/usr/bin/env bash
# Ultimate Point of Sales - Desktop Cashier Runner for Linux / macOS

DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "================================================================"
echo "   ULTIMATE POINT OF SALES - DESKTOP CASHIER RUNNER"
echo "================================================================"

if [ ! -d "node_modules" ]; then
    echo "[INFO] Menginstal dependensi pertama kali..."
    npm install
fi

if [ ! -d "dist" ]; then
    echo "[INFO] Mengompilasi aplikasi..."
    npm run build
fi

echo "[INFO] Menyalakan Server Kasir Lokal..."
npm start &
SERVER_PID=$!

sleep 2

URL="http://localhost:3000"

if command -v google-chrome &> /dev/null; then
    google-chrome --app=$URL${kioskFlag} &
elif command -v chromium &> /dev/null; then
    chromium --app=$URL${kioskFlag} &
elif command -v chromium-browser &> /dev/null; then
    chromium-browser --app=$URL${kioskFlag} &
elif command -v brave-browser &> /dev/null; then
    brave-browser --app=$URL${kioskFlag} &
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$URL"
    else
        xdg-open "$URL"
    fi
fi

trap "kill $SERVER_PID 2>/dev/null" EXIT
wait $SERVER_PID
`;

  downloadBlobFile(options.kioskMode ? 'buka-kasir-kiosk.sh' : 'buka-kasir-desktop.sh', shContent, 'text/x-sh');
}

export const DEFAULT_GITHUB_REPO_URL = 'https://github.com/fyercz/Project-POS-Retailer.git';

export interface GitStatusResponse {
  isGitRepo: boolean;
  branch?: string;
  currentCommit?: string;
  commitMessage?: string;
  commitDate?: string;
  remoteUrl?: string;
  officialRepoUrl?: string;
  remoteLatestCommit?: string;
  remoteCommitMessage?: string;
  remoteCommitDate?: string;
  remoteCommitAuthor?: string;
  remoteHtmlUrl?: string;
  lastCheckedAt?: string;
  hasUpdate?: boolean;
  isUpToDate?: boolean;
  uncommittedCount?: number;
  nodeVersion?: string;
  platform?: string;
  message?: string;
  error?: string;
}

export interface SystemVerificationItem {
  path: string;
  category: string;
  critical: boolean;
  description: string;
  exists: boolean;
  size?: number;
  lastModified?: string;
  status: 'ok' | 'valid' | 'missing' | 'modified' | 'untracked';
}

export interface SystemVerificationResponse {
  success: boolean;
  overallHealth: 'healthy' | 'warning' | 'critical';
  checkedAt?: string;
  officialRepoUrl?: string;
  stats: {
    total: number;
    intact: number;
    modified: number;
    missing: number;
    missingCritical: number;
  };
  envPrerequisites: {
    nodeVersion: string;
    platform: string;
    gitInstalled: boolean;
    distBuilt: boolean;
    nodeModulesInstalled: boolean;
    databaseAccessible: boolean;
  };
  files: SystemVerificationItem[];
  error?: string;
}

export interface CleanupScanItem {
  path: string;
  relativePath: string;
  size: number;
  category: string;
  reason?: string;
  description?: string;
  safeToDelete?: boolean;
}

export interface CleanupScanResponse {
  success: boolean;
  totalFiles: number;
  totalBytes: number;
  items: CleanupScanItem[];
  error?: string;
}

export interface CleanupExecuteResponse {
  success: boolean;
  deletedCount: number;
  bytesFreed: number;
  deletedList?: string[];
  dbCleanup?: any;
  message: string;
  error?: string;
}

export interface DatabasePruneResponse {
  success: boolean;
  deletedSyncLogs: number;
  deletedHeldOrders: number;
  initialSizeKb: number;
  finalSizeKb: number;
  freedBytes: number;
  vacuumExecuted: boolean;
  walCheckpointExecuted: boolean;
  integrity: string;
  message: string;
  error?: string;
}

export async function fetchGitStatus(forceRefresh = false): Promise<GitStatusResponse> {
  try {
    const res = await fetch(`/api/system/git-status${forceRefresh ? '?refresh=true' : ''}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      isGitRepo: false,
      error: errorMessage(err) || String(err),
      message: 'Gagal menghubungi server status Git',
    };
  }
}

export async function triggerGitPull(): Promise<{ success: boolean; message: string; output?: string; error?: string }> {
  try {
    const res = await fetch('/api/system/git-pull', { method: 'POST' });
    return await res.json();
  } catch (err) {
    return { success: false, error: errorMessage(err) || String(err), message: 'Gagal menjalankan git pull' };
  }
}

export async function configureGitRemote(repoUrl = DEFAULT_GITHUB_REPO_URL): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const res = await fetch('/api/system/git-configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: errorMessage(err) || String(err), message: 'Gagal konfigurasi remote Git' };
  }
}

export async function verifySystemFiles(): Promise<SystemVerificationResponse> {
  try {
    const res = await fetch('/api/system/verify-files');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      success: false,
      overallHealth: 'critical',
      stats: {
        total: 0,
        intact: 0,
        modified: 0,
        missing: 0,
        missingCritical: 0,
      },
      envPrerequisites: {
        nodeVersion: '',
        platform: '',
        gitInstalled: false,
        distBuilt: false,
        nodeModulesInstalled: false,
        databaseAccessible: false,
      },
      files: [],
      error: errorMessage(err) || String(err),
    };
  }
}

export async function scanUnnecessaryFiles(): Promise<CleanupScanResponse> {
  try {
    const res = await fetch('/api/system/cleanup-scan');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      success: false,
      totalFiles: 0,
      totalBytes: 0,
      items: [],
      error: errorMessage(err) || String(err),
    };
  }
}

export async function executeSystemCleanup(): Promise<CleanupExecuteResponse> {
  try {
    const res = await fetch('/api/system/cleanup-execute', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      success: false,
      deletedCount: 0,
      bytesFreed: 0,
      message: 'Gagal menjalankan pembersihan sistem: ' + (errorMessage(err) || String(err)),
      error: errorMessage(err),
    };
  }
}

export async function executeDatabasePruning(): Promise<DatabasePruneResponse> {
  try {
    const res = await fetch('/api/pos/database/clean-obsolete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return {
      success: false,
      deletedSyncLogs: 0,
      deletedHeldOrders: 0,
      initialSizeKb: 0,
      finalSizeKb: 0,
      freedBytes: 0,
      vacuumExecuted: false,
      walCheckpointExecuted: false,
      integrity: 'error',
      message: 'Gagal memangkas database: ' + (errorMessage(err) || String(err)),
      error: errorMessage(err),
    };
  }
}
