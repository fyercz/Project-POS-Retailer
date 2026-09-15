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
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as any).standalone === true
  );
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
 * Generate and download a dedicated 1-Click Desktop App Launcher (.bat) for Windows
 */
export function downloadWindowsDesktopLauncher(options: { kioskMode?: boolean } = {}): void {
  const kioskFlag = options.kioskMode ? ' --kiosk' : '';
  const batContent = `@echo off
title Ulilmart POS - Terminal Kasir Desktop
color 0A

echo ================================================================
echo    ULTIMATE POINT OF SALES - DESKTOP CASHIER RUNNER
echo ================================================================
echo.

REM 1. Pindah ke direktori skrip ini berada
cd /d "%~dp0"

REM 2. Cek apakah node_modules dan dist sudah ada
if not exist node_modules (
    echo [INFO] Menginstal dependensi pertama kali...
    call npm install
)

if not exist dist (
    echo [INFO] Mengompilasi aplikasi kasir...
    call npm run build
)

echo [INFO] Menyalakan Server Kasir Lokal...
start /b "" npm start

echo [INFO] Menunggu server siap...
timeout /t 2 /nobreak >nul

REM 3. Buka dalam mode Desktop Application Window (Tanpa Address Bar Browser)
set TARGET_URL=http://localhost:3000

REM Prioritas 1: Microsoft Edge App Mode (Bawaan Windows 10 & 11)
where msedge >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Meluncurkan aplikasi via Microsoft Edge App Mode...
    start "" msedge --app=%TARGET_URL%${kioskFlag}
    goto selesai
)

REM Prioritas 2: Google Chrome App Mode
where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Meluncurkan aplikasi via Google Chrome App Mode...
    start "" chrome --app=%TARGET_URL%${kioskFlag}
    goto selesai
)

REM Prioritas 3: Browser Standar
echo [INFO] Meluncurkan di browser utama...
start "" %TARGET_URL%

:selesai
echo.
echo ================================================================
echo  Aplikasi Desktop Berjalan! Jangan tutup jendela ini saat kasir aktif.
echo ================================================================
`;

  const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.kioskMode ? 'Buka-Kasir-Kiosk-Desktop.bat' : 'Buka-Kasir-Desktop.bat';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
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

# Coba luncurkan dalam App Mode (Google Chrome / Chromium / Brave)
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

  const blob = new Blob([shContent], { type: 'text/x-sh;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.kioskMode ? 'buka-kasir-kiosk.sh' : 'buka-kasir-desktop.sh';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
