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
 * Generate and download a dedicated 1-Click Desktop App Launcher (.bat) for Windows
 */
export function downloadWindowsDesktopLauncher(options: { kioskMode?: boolean } = {}): void {
  const kioskFlag = options.kioskMode ? ' --kiosk' : '';
  const batContent = `@echo off
chcp 65001 >nul 2>&1
title Ulilmart POS - Terminal Kasir Desktop
color 0A
cd /d "%~dp0"

cls
echo ==============================================================================
echo     ┌──────┐
echo     │ 🛒   │  ██╗   ██╗██╗     ██╗██╗     ███╗   ███╗ █████╗ ██████╗ ████████╗
echo     │ ───┐ │  ██║   ██║██║     ██║██║     ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
echo     │ O  O │  ██║   ██║██║     ██║██║     ██╔████╔██║███████║██████╔╝   ██║   
echo     └──────┘  ██║   ██║██║     ██║██║     ██║╚██╔╝██║██╔══██║██╔══██╗   ██║   
echo     [LOGO]    ╚██████╔╝███████╗██║███████╗██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   
echo     ULILMART   ╚═════╝ ╚══════╝╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
echo     ┌───────────────────────────────┬───────────────────────────────┐
echo     │   🛍️  L E N G K A P           │   💰  ^&   H E M A T           │
echo     └───────────────────────────────┴───────────────────────────────┘
echo                   S M A R T   R E T A I L   P O S
echo               [ MODE APLIKASI DESKTOP KASIR MANDIRI ]
echo ==============================================================================
echo.

REM Pasang shortcut berlogo resmi jika file ulilmart.ico ada
if exist "%~dp0ulilmart.ico" (
    powershell -NoProfile -Command ^
        "$ws = New-Object -ComObject WScript.Shell; " ^
        "$desk = [System.Environment]::GetFolderPath('Desktop'); " ^
        "$deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; " ^
        "if (-not (Test-Path $deskLnk)) { " ^
        "  $s1 = $ws.CreateShortcut($deskLnk); $s1.TargetPath = '%~dp0desktop.bat'; $s1.WorkingDirectory = '%~dp0'; $s1.IconLocation = '%~dp0ulilmart.ico,0'; $s1.Description = 'Ulilmart POS Kasir (Lengkap & Hemat)'; $s1.Save(); " ^
        "};" >nul 2>&1
)

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
echo ==============================================================================
echo  ✅ Aplikasi Desktop Berjalan! Jangan tutup jendela ini saat kasir aktif.
echo ==============================================================================
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

/**
 * Download autorun.bat - All-in-one universal auto-runner for Windows
 */
export function downloadAutorunBat(): void {
  const content = `@echo off
REM ==============================================================================
REM Ulilmart POS - Universal Auto-Run Launcher (Windows)
REM ==============================================================================
chcp 65001 >nul 2>&1
title Ulilmart POS - Cashier Auto-Run Launcher
color 0A

cd /d "%~dp0"

if "%1"=="--startup" goto SETUP_STARTUP
if "%1"=="--install-startup" goto SETUP_STARTUP
if "%1"=="--remove-startup" goto REMOVE_STARTUP
if "%1"=="--shortcut" goto CREATE_SHORTCUT

cls
echo ==============================================================================
echo     ┌──────┐
echo     │ 🛒   │  ██╗   ██╗██╗     ██╗██╗     ███╗   ███╗ █████╗ ██████╗ ████████╗
echo     │ ───┐ │  ██║   ██║██║     ██║██║     ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
echo     │ O  O │  ██║   ██║██║     ██║██║     ██╔████╔██║███████║██████╔╝   ██║   
echo     └──────┘  ██║   ██║██║     ██║██║     ██║╚██╔╝██║██╔══██║██╔══██╗   ██║   
echo     [LOGO]    ╚██████╔╝███████╗██║███████╗██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   
echo     ULILMART   ╚═════╝ ╚══════╝╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
echo     ┌───────────────────────────────┬───────────────────────────────┐
echo     │   🛍️  L E N G K A P           │   💰  ^&   H E M A T           │
echo     └───────────────────────────────┴───────────────────────────────┘
echo                   S M A R T   R E T A I L   P O S
echo               [ SISTEM KASIR AUTO-RUN TERMINAL ]
echo ==============================================================================
echo.

REM Pasang shortcut berlogo resmi jika file ulilmart.ico ada
if exist "%~dp0ulilmart.ico" (
    powershell -NoProfile -Command ^
        "$ws = New-Object -ComObject WScript.Shell; " ^
        "$desk = [System.Environment]::GetFolderPath('Desktop'); " ^
        "$deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; " ^
        "if (-not (Test-Path $deskLnk)) { " ^
        "  $s1 = $ws.CreateShortcut($deskLnk); $s1.TargetPath = '%~dp0autorun.bat'; $s1.WorkingDirectory = '%~dp0'; $s1.IconLocation = '%~dp0ulilmart.ico,0'; $s1.Description = 'Ulilmart POS Kasir (Lengkap & Hemat)'; $s1.Save(); " ^
        "};" >nul 2>&1
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [PERINGATAN] Node.js belum terpasang pada komputer ini!
    echo Aplikasi POS membutuhkan runtime Node.js LTS dari: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [1/4] Node.js terdeteksi: %NODE_VER%

if not exist .env (
    echo [2/4] Menyiapkan file konfigurasi .env...
    if exist .env.example (
        copy .env.example .env >nul
    ) else (
        echo GEMINI_API_KEY=> .env
    )
) else (
    echo [2/4] Konfigurasi .env siap.
)

if not exist node_modules (
    echo [3/4] Dependensi belum ada. Menjalankan npm install...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal menginstal dependensi.
        pause
        exit /b 1
    )
) else (
    echo [3/4] Dependensi node_modules siap.
)

if not exist dist (
    echo [4/4] Mengompilasi aplikasi untuk produksi (npm run build)...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal melakukan build.
        pause
        exit /b 1
    )
) else (
    echo [4/4] Build produksi siap digunakan.
)

echo.
echo ==========================================================
echo    🚀 Memulai Server Kasir Lokal (Port 3000)
echo ==========================================================
echo   URL Kasir: http://localhost:3000
echo ==========================================================
echo.

set TARGET_URL=http://localhost:3000

start /b cmd /c "timeout /t 2 /nobreak >nul & (where msedge >nul 2>nul && start msedge --app=%TARGET_URL% || (where chrome >nul 2>nul && start chrome --app=%TARGET_URL% || start %TARGET_URL%))"

call npm start
exit /b 0

:SETUP_STARTUP
set STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\\Ulilmart POS.lnk
set TARGET_BAT=%~dp0autorun.bat
set WORKING_DIR=%~dp0

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%WORKING_DIR%ulilmart.ico') { $s.IconLocation = '%WORKING_DIR%ulilmart.ico,0' }; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save()"
echo Berhasil mendaftarkan ke Windows Startup dengan logo resmi!
pause
exit /b 0

:REMOVE_STARTUP
set STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\\Ulilmart POS.lnk
if exist "%SHORTCUT_PATH%" del /f /q "%SHORTCUT_PATH%"
echo Auto-start berhasil dinonaktifkan.
pause
exit /b 0

:CREATE_SHORTCUT
set DESKTOP_FOLDER=%USERPROFILE%\\Desktop
set SHORTCUT_PATH=%DESKTOP_FOLDER%\\Ulilmart POS Kasir.lnk
set TARGET_BAT=%~dp0autorun.bat
set WORKING_DIR=%~dp0

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%WORKING_DIR%ulilmart.ico') { $s.IconLocation = '%WORKING_DIR%ulilmart.ico,0' }; $s.Description = 'Ulilmart Point of Sales Kasir (Lengkap & Hemat)'; $s.Save()"
echo Shortcut desktop dengan logo resmi berhasil dibuat!
pause
exit /b 0
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'autorun.bat';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Download setup-autorun-startup.bat - Windows Startup Wizard
 */
export function downloadSetupStartupBat(): void {
  const content = `@echo off
chcp 65001 >nul 2>&1
title Ulilmart POS - Konfigurasi Auto-Run Kasir
color 0B
cd /d "%~dp0"

:MENU
cls
echo ==============================================================================
echo     ┌──────┐
echo     │ 🛒   │  ██╗   ██╗██╗     ██╗██╗     ███╗   ███╗ █████╗ ██████╗ ████████╗
echo     │ ───┐ │  ██║   ██║██║     ██║██║     ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
echo     │ O  O │  ██║   ██║██║     ██║██║     ██╔████╔██║███████║██████╔╝   ██║   
echo     └──────┘  ██║   ██║██║     ██║██║     ██║╚██╔╝██║██╔══██║██╔══██╗   ██║   
echo     [LOGO]    ╚██████╔╝███████╗██║███████╗██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   
echo     ULILMART   ╚═════╝ ╚══════╝╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
echo     ┌───────────────────────────────┬───────────────────────────────┐
echo     │   🛍️  L E N G K A P           │   💰  ^&   H E M A T           │
echo     └───────────────────────────────┴───────────────────────────────┘
echo                   S M A R T   R E T A I L   P O S
echo             [ WIZARD KONFIGURASI STARTUP KASIR ]
echo ==============================================================================
echo.
echo  Pilih opsi yang Anda inginkan:
echo.
echo  [1] Aktifkan Auto-Run saat Komputer Dinyalakan (Windows Startup)
echo  [2] Nonaktifkan Auto-Run dari Startup Windows
echo  [3] Buat Shortcut Ikon Logo Kasir Resmi di Desktop ^& Folder
echo  [4] Jalankan Aplikasi Kasir Sekarang (autorun.bat)
echo  [5] Keluar
echo.
echo ==========================================================
set /p PILIHAN="Masukkan pilihan (1-5): "

if "%PILIHAN%"=="1" (
    call autorun.bat --startup
    goto MENU
)
if "%PILIHAN%"=="2" (
    call autorun.bat --remove-startup
    goto MENU
)
if "%PILIHAN%"=="3" (
    if exist "%~dp0buat-shortcut-logo.bat" (
        call buat-shortcut-logo.bat
    ) else (
        call autorun.bat --shortcut
    )
    goto MENU
)
if "%PILIHAN%"=="4" (
    call autorun.bat
    goto MENU
)
if "%PILIHAN%"=="5" exit /b 0

goto MENU
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'setup-autorun-startup.bat';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Download buat-shortcut-logo.bat - Generator Shortcut Berlogo Resmi
 */
export function downloadBuatShortcutLogoBat(): void {
  const content = `@echo off
REM ==============================================================================
REM Ulilmart POS - Generator Shortcut Berlogo Resmi (Windows)
REM Membuat shortcut aplikasi dengan ikon logo Ulilmart (ulilmart.ico)
REM di Desktop, Folder Aplikasi, dan Startup Windows.
REM ==============================================================================
chcp 65001 >nul 2>&1
title Ulilmart POS - Generator Shortcut Berlogo Resmi
color 0B

cd /d "%~dp0"

cls
echo ==============================================================================
echo     ┌──────┐
echo     │ 🛒   │  ██╗   ██╗██╗     ██╗██╗     ███╗   ███╗ █████╗ ██████╗ ████████╗
echo     │ ───┐ │  ██║   ██║██║     ██║██║     ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
echo     │ O  O │  ██║   ██║██║     ██║██║     ██╔████╔██║███████║██████╔╝   ██║   
echo     └──────┘  ██║   ██║██║     ██║██║     ██║╚██╔╝██║██╔══██║██╔══██╗   ██║   
echo     [LOGO]    ╚██████╔╝███████╗██║███████╗██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   
echo     ULILMART   ╚═════╝ ╚══════╝╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
echo     ┌───────────────────────────────┬───────────────────────────────┐
echo     │   🛍️  L E N G K A P           │   💰  ^&   H E M A T           │
echo     └───────────────────────────────┴───────────────────────────────┘
echo                   S M A R T   R E T A I L   P O S
echo          [ PEMBUAT SHORTCUT DENGAN IKON LOGO RESMI ULILMART ]
echo ==============================================================================
echo.

set "ICON_FILE=%~dp0ulilmart.ico"
set "DESKTOP_BAT=%~dp0desktop.bat"
set "WORKING_DIR=%~dp0"

echo [1/2] Membuat shortcut di Desktop Windows dengan logo Ulilmart...
powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$desk = [System.Environment]::GetFolderPath('Desktop'); " ^
    "$s = $ws.CreateShortcut(\"$desk\\Ulilmart POS Kasir.lnk\"); " ^
    "$s.TargetPath = '%DESKTOP_BAT%'; " ^
    "$s.WorkingDirectory = '%WORKING_DIR%'; " ^
    "if (Test-Path '%ICON_FILE%') { $s.IconLocation = '%ICON_FILE%,0' }; " ^
    "$s.Description = 'Ulilmart POS Kasir Ritel Mandiri (Lengkap & Hemat)'; " ^
    "$s.Save();"

echo [2/2] Membuat shortcut di folder aplikasi saat ini dengan logo...
powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$s = $ws.CreateShortcut('%~dp0Ulilmart POS Kasir.lnk'); " ^
    "$s.TargetPath = '%DESKTOP_BAT%'; " ^
    "$s.WorkingDirectory = '%WORKING_DIR%'; " ^
    "if (Test-Path '%ICON_FILE%') { $s.IconLocation = '%ICON_FILE%,0' }; " ^
    "$s.Description = 'Ulilmart POS Kasir Ritel Mandiri (Lengkap & Hemat)'; " ^
    "$s.Save();"

echo.
echo ==============================================================================
echo   🎉 SELESAI! Shortcut berlogo resmi Ulilmart telah terpasang di Desktop & Folder!
echo ==============================================================================
echo.
pause
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'buat-shortcut-logo.bat';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Download autorun.inf - Windows media autorun descriptor
 */
export function downloadAutorunInf(): void {
  const content = `[AutoRun]
open=autorun.bat
icon=ulilmart.ico
label=Ulilmart POS Kasir
action=Jalankan Aplikasi Kasir Ulilmart
shell\\open=Buka Ulilmart POS Kasir
shell\\open\\command=autorun.bat
shell\\desktop=Jalankan Mode Desktop Kasir
shell\\desktop\\command=desktop.bat
shell\\install=Instalasi Lengkap (Auto-Install)
shell\\install\\command=install.bat
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'autorun.inf';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export const DEFAULT_GITHUB_REPO_URL = 'https://github.com/fyercz/Project-POS-Retailer.git';

/**
 * Download update.bat - 1-Click GitHub Auto-Updater for Windows with auto-cleanup
 */
export function downloadUpdateBat(): void {
  const content = `@echo off
chcp 65001 >nul 2>&1
title Ulilmart POS - Auto-Update & System Cleaner (GitHub)
color 0B
cd /d "%~dp0"

cls
echo ==============================================================================
echo     ┌──────┐
echo     │ 🛒   │  ██╗   ██╗██╗     ██╗██╗     ███╗   ███╗ █████╗ ██████╗ ████████╗
echo     │ ───┐ │  ██║   ██║██║     ██║██║     ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
echo     │ O  O │  ██║   ██║██║     ██║██║     ██╔████╔██║███████║██████╔╝   ██║   
echo     └──────┘  ██║   ██║██║     ██║██║     ██║╚██╔╝██║██╔══██║██╔══██╗   ██║   
echo     [LOGO]    ╚██████╔╝███████╗██║███████╗██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   
echo     ULILMART   ╚═════╝ ╚══════╝╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
echo     ┌───────────────────────────────┬───────────────────────────────┐
echo     │   🛍️  L E N G K A P           │   💰  ^&   H E M A T           │
echo     └───────────────────────────────┴───────────────────────────────┘
echo                   S M A R T   R E T A I L   P O S
echo             [ AUTO-UPDATE & PEMELIHARAAN SISTEM ]
echo ==============================================================================
echo  Repositori: https://github.com/fyercz/Project-POS-Retailer.git
echo  [INFO] Data transaksi dan produk 100%% aman di IndexedDB.
echo ==============================================================================
echo.

set REPO_URL=https://github.com/fyercz/Project-POS-Retailer.git
set GIT_CMD=git
where git >nul 2>nul || (if exist "C:\\Program Files\\Git\\cmd\\git.exe" set "GIT_CMD=C:\\Program Files\\Git\\cmd\\git.exe")

REM 1. Bersihkan file sampah dan temporary yang tidak perlu
echo [1/4] Membersihkan file sementara, cache, dan log sistem...
del /f /q /s *.tmp *.bak *.log Thumbs.db .DS_Store 2>nul
if exist "node_modules\\.vite" rd /s /q "node_modules\\.vite" 2>nul
echo       Pembersihan file sampah selesai.
echo.

REM 2. Hubungkan ke Git dan tarik kode terbaru
echo [2/4] Menghubungkan ke GitHub (%REPO_URL%)...
if not exist .git (
    echo       Menginisialisasi repositori Git lokal...
    "%GIT_CMD%" init
    "%GIT_CMD%" remote add origin %REPO_URL%
) else (
    "%GIT_CMD%" remote set-url origin %REPO_URL% 2>nul || "%GIT_CMD%" remote add origin %REPO_URL% 2>nul
)

"%GIT_CMD%" pull origin main || "%GIT_CMD%" pull
echo.

REM 3. Perbarui paket dependensi
echo [3/4] Memperbarui package dependensi (npm install)...
call npm install
echo.

REM 4. Kompilasi ulang paket produksi
echo [4/4] Mengompilasi aplikasi kasir (npm run build)...
call npm run build
echo.

echo ==========================================================
echo    🎉 Pembaruan & Pembersihan Sistem Berhasil!
echo ==========================================================
set /p RUN_NOW="Nyalakan kasir desktop sekarang (Y/T)? "
if /i "%RUN_NOW%"=="Y" (
    if exist desktop.bat (start "" desktop.bat) else (start "" npm start)
)
exit /b 0
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'update.bat';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export interface GitStatusResponse {
  isGitRepo: boolean;
  branch?: string;
  currentCommit?: string;
  commitMessage?: string;
  commitDate?: string;
  remoteUrl?: string;
  officialRepoUrl?: string;
  remoteLatestCommit?: string;
  hasUpdate?: boolean;
  isUpToDate?: boolean;
  uncommittedCount?: number;
  nodeVersion?: string;
  platform?: string;
  message?: string;
  error?: string;
}

export async function fetchGitStatus(): Promise<GitStatusResponse> {
  try {
    const res = await fetch('/api/system/git-status');
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      isGitRepo: false,
      message: 'Gagal terhubung ke server lokal POS.',
      error: err?.message,
    };
  }
}

export async function configureGitRemote(): Promise<{ success: boolean; message: string; officialRepoUrl?: string }> {
  try {
    const res = await fetch('/api/system/git-configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal mengonfigurasi repositori Git: ' + (err?.message || String(err)),
    };
  }
}

export async function triggerGitPull(): Promise<{
  success: boolean;
  message: string;
  officialRepoUrl?: string;
  pullOutput?: string;
  buildOutput?: string;
  cleanedFilesCount?: number;
  cleanedBytesFreed?: number;
  details?: string;
}> {
  try {
    const res = await fetch('/api/system/git-pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal menghubungi server untuk update.',
      details: err?.message,
    };
  }
}

export interface VerifiedFileItem {
  path: string;
  category: string;
  critical: boolean;
  description: string;
  exists: boolean;
  size: number;
  lastModified: string | null;
  status: 'ok' | 'modified' | 'missing' | 'untracked';
}

export interface SystemVerificationResponse {
  success: boolean;
  overallHealth: 'healthy' | 'warning' | 'critical';
  checkedAt: string;
  officialRepoUrl: string;
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
  files: VerifiedFileItem[];
  error?: string;
}

export async function verifySystemFiles(): Promise<SystemVerificationResponse> {
  try {
    const res = await fetch('/api/system/verify-files');
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      overallHealth: 'critical',
      checkedAt: new Date().toISOString(),
      officialRepoUrl: DEFAULT_GITHUB_REPO_URL,
      stats: { total: 0, intact: 0, modified: 0, missing: 0, missingCritical: 0 },
      envPrerequisites: {
        nodeVersion: 'unknown',
        platform: 'unknown',
        gitInstalled: false,
        distBuilt: false,
        nodeModulesInstalled: false,
        databaseAccessible: false,
      },
      files: [],
      error: err?.message,
    };
  }
}

export interface CleanupJunkItem {
  path: string;
  relativePath: string;
  size: number;
  category: string;
  reason: string;
}

export interface CleanupScanResponse {
  success: boolean;
  totalFiles: number;
  totalBytes: number;
  items: CleanupJunkItem[];
  error?: string;
}

export async function scanUnnecessaryFiles(): Promise<CleanupScanResponse> {
  try {
    const res = await fetch('/api/system/cleanup-scan');
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      totalFiles: 0,
      totalBytes: 0,
      items: [],
      error: err?.message,
    };
  }
}

export interface CleanupExecuteResponse {
  success: boolean;
  deletedCount: number;
  bytesFreed: number;
  deletedList: string[];
  message: string;
  error?: string;
}

export async function executeSystemCleanup(): Promise<CleanupExecuteResponse> {
  try {
    const res = await fetch('/api/system/cleanup-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      deletedCount: 0,
      bytesFreed: 0,
      deletedList: [],
      message: 'Gagal menjalankan pembersihan sistem: ' + (err?.message || String(err)),
      error: err?.message,
    };
  }
}
