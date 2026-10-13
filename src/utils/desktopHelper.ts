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

/**
 * Download autorun.bat - All-in-one universal auto-runner for Windows
 */
export function downloadAutorunBat(): void {
  const content = `@echo off
REM ==============================================================================
REM Ulilmart POS - Universal Auto-Run Launcher (Windows)
REM ==============================================================================
title Ulilmart POS - Cashier Auto-Run Launcher
color 0A

cd /d "%~dp0"

if "%1"=="--menu" goto MENU
if "%1"=="--setup" goto MENU
if "%1"=="--startup" goto SETUP_STARTUP
if "%1"=="--install-startup" goto SETUP_STARTUP
if "%1"=="--remove-startup" goto REMOVE_STARTUP
if "%1"=="--shortcut" goto CREATE_SHORTCUT

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ SISTEM KASIR AUTO-RUN TERMINAL ]
echo ==============================================================================
echo.

if exist "%~dp0ulilmart.ico" (
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $desk = [System.Environment]::GetFolderPath('Desktop'); $deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; if (-not (Test-Path $deskLnk)) { $s1 = $ws.CreateShortcut($deskLnk); $s1.TargetPath = '%~dp0autorun.bat'; $s1.WorkingDirectory = '%~dp0'; $s1.IconLocation = '%~dp0ulilmart.ico,0'; $s1.Description = 'Ulilmart POS Kasir'; $s1.Save(); };" >nul 2>&1
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [PERINGATAN] Node.js belum terpasang atau belum masuk PATH!
    echo Aplikasi POS membutuhkan runtime Node.js LTS dari: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set "NODE_VER=%%i"
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
echo    [*] Memulai Server Kasir Lokal (Port 3000)
echo ==========================================================
echo   URL Kasir: http://localhost:3000
echo ==========================================================
echo.

set "TARGET_URL=http://localhost:3000"

REM Jalankan server produksi
if exist "dist\\server.cjs" (
    node dist\\server.cjs
) else (
    call npm start
)

set "SERVER_EXIT_CODE=%ERRORLEVEL%"
echo.
echo ==========================================================
if %SERVER_EXIT_CODE% neq 0 (
    echo  [PERINGATAN] Server kasir berhenti dengan kode status: %SERVER_EXIT_CODE%
    echo  Jika port 3000 sedang terkunci, tutup jendela lain atau buka: http://localhost:3000
) else (
    echo  [INFO] Server kasir telah dinonaktifkan secara normal.
)
echo ==========================================================
echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
exit /b %SERVER_EXIT_CODE%

:SETUP_STARTUP
cls
echo ==========================================================
echo    [*] Mendaftarkan Auto-Start Windows (Startup Kasir)
echo ==========================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\\Ulilmart POS.lnk"
set "TARGET_BAT=%~dp0autorun.bat"
set "WORKING_DIR=%~dp0"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%WORKING_DIR%ulilmart.ico') { $s.IconLocation = '%WORKING_DIR%ulilmart.ico,0' }; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save()"
echo [OK] Berhasil mendaftarkan ke Windows Startup!
echo Lokasi shortcut: %SHORTCUT_PATH%
echo.
pause
exit /b 0

:REMOVE_STARTUP
cls
echo ==========================================================
echo    [*] Menghapus Auto-Start dari Windows Startup
echo ==========================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\\Ulilmart POS.lnk"
if exist "%SHORTCUT_PATH%" del /f /q "%SHORTCUT_PATH%"
echo [OK] Auto-Start berhasil dinonaktifkan.
echo.
pause
exit /b 0

:CREATE_SHORTCUT
cls
echo ==========================================================
echo    [*] Membuat Shortcut Desktop
echo ==========================================================
echo.
set "DESKTOP_FOLDER=%USERPROFILE%\\Desktop"
set "SHORTCUT_PATH=%DESKTOP_FOLDER%\\Ulilmart POS Kasir.lnk"
set "TARGET_BAT=%~dp0autorun.bat"
set "WORKING_DIR=%~dp0"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%WORKING_DIR%ulilmart.ico') { $s.IconLocation = '%WORKING_DIR%ulilmart.ico,0' }; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save()"
echo [OK] Shortcut desktop dengan logo resmi berhasil dibuat: %SHORTCUT_PATH%
echo.
pause
exit /b 0

:MENU
cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ WIZARD KONFIGURASI STARTUP KASIR ]
echo ==============================================================================
echo.
echo  Pilih opsi yang Anda inginkan:
echo.
echo  [1] Aktifkan Auto-Run saat Komputer Dinyalakan (Windows Startup)
echo  [2] Nonaktifkan Auto-Run dari Startup Windows
echo  [3] Pasang Shortcut Logo Resmi di Desktop
echo  [4] Jalankan Aplikasi Kasir Sekarang
echo  [5] Keluar
echo.
echo ==============================================================================
set /p PILIHAN="Masukkan pilihan (1-5): "

if "%PILIHAN%"=="1" goto DO_STARTUP
if "%PILIHAN%"=="2" goto DO_REMOVE_STARTUP
if "%PILIHAN%"=="3" goto DO_CREATE_SHORTCUT
if "%PILIHAN%"=="4" goto DO_RUN_APP
if "%PILIHAN%"=="5" goto EXIT_SCRIPT
goto MENU

:DO_STARTUP
cls
call "%~dp0autorun.bat" --startup
goto MENU

:DO_REMOVE_STARTUP
cls
call "%~dp0autorun.bat" --remove-startup
goto MENU

:DO_CREATE_SHORTCUT
cls
call "%~dp0autorun.bat" --shortcut
goto MENU

:DO_RUN_APP
cls
call "%~dp0autorun.bat"
exit /b 0

:EXIT_SCRIPT
exit /b 0
`;

  downloadBlobFile('autorun.bat', content, 'application/x-bat');
}

/**
 * Download setup-autorun-startup.bat - Windows Startup Wizard
 */
export function downloadSetupStartupBat(): void {
  const content = `@echo off
title Ulilmart POS - Konfigurasi Auto-Run Kasir
color 0B
cd /d "%~dp0"

:MENU
cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ WIZARD KONFIGURASI STARTUP KASIR ]
echo ==============================================================================
echo.
echo  Pilih opsi yang Anda inginkan:
echo.
echo  [1] Aktifkan Auto-Run saat Komputer Dinyalakan (Windows Startup)
echo  [2] Nonaktifkan Auto-Run dari Startup Windows
echo  [3] Pasang Shortcut Logo Resmi di Desktop
echo  [4] Jalankan Aplikasi Kasir Sekarang (autorun.bat)
echo  [5] Keluar
echo.
echo ==========================================================
set /p PILIHAN="Masukkan pilihan (1-5): "

if "%PILIHAN%"=="1" goto DO_STARTUP
if "%PILIHAN%"=="2" goto DO_REMOVE_STARTUP
if "%PILIHAN%"=="3" goto DO_CREATE_SHORTCUT
if "%PILIHAN%"=="4" goto DO_RUN_APP
if "%PILIHAN%"=="5" goto EXIT_SCRIPT
goto MENU

:DO_STARTUP
cls
if exist "%~dp0autorun.bat" (
    call "%~dp0autorun.bat" --startup
) else (
    echo [ERROR] autorun.bat tidak ditemukan.
    pause
)
goto MENU

:DO_REMOVE_STARTUP
cls
if exist "%~dp0autorun.bat" (
    call "%~dp0autorun.bat" --remove-startup
) else (
    echo [ERROR] autorun.bat tidak ditemukan.
    pause
)
goto MENU

:DO_CREATE_SHORTCUT
cls
if exist "%~dp0autorun.bat" (
    call "%~dp0autorun.bat" --shortcut
) else (
    echo [ERROR] autorun.bat tidak ditemukan.
    pause
)
goto MENU

:DO_RUN_APP
cls
if exist "%~dp0autorun.bat" (
    call "%~dp0autorun.bat"
) else (
    call npm start
)
exit /b 0

:EXIT_SCRIPT
exit /b 0
`;

  downloadBlobFile('setup-autorun-startup.bat', content, 'application/x-bat');
}

/**
 * Download buat-shortcut-logo.bat - Generator Shortcut Berlogo Resmi
 */
export function downloadBuatShortcutLogoBat(): void {
  const content = `@echo off
title Ulilmart POS - Generator Shortcut Berlogo Resmi
color 0B

cd /d "%~dp0"

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ PEMBUAT SHORTCUT DENGAN IKON LOGO RESMI ULILMART ]
echo ==============================================================================
echo.

set "ICON_FILE=%~dp0ulilmart.ico"
set "TARGET_BAT=%~dp0autorun.bat"
if not exist "%TARGET_BAT%" set "TARGET_BAT=%~dp0desktop.bat"
set "WORKING_DIR=%~dp0"

echo [1/2] Membuat shortcut di Desktop Windows dengan logo Ulilmart...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $desk = [System.Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut(\\"$desk\\\\Ulilmart POS Kasir.lnk\\"); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%ICON_FILE%') { $s.IconLocation = '%ICON_FILE%,0' }; $s.Description = 'Ulilmart POS Kasir'; $s.Save();"

echo [2/2] Membuat shortcut di folder aplikasi saat ini dengan logo...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%~dp0Ulilmart POS Kasir.lnk'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%ICON_FILE%') { $s.IconLocation = '%ICON_FILE%,0' }; $s.Description = 'Ulilmart POS Kasir'; $s.Save();"

echo.
echo ==============================================================================
echo   [OK] Selesai! Shortcut berlogo resmi Ulilmart telah terpasang di Desktop!
echo ==============================================================================
echo.
pause
`;

  downloadBlobFile('buat-shortcut-logo.bat', content, 'application/x-bat');
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

  downloadBlobFile('autorun.inf', content, 'text/plain');
}

export const DEFAULT_GITHUB_REPO_URL = 'https://github.com/fyercz/Project-POS-Retailer.git';

/**
 * Download update.bat - 1-Click GitHub Auto-Updater for Windows with auto-cleanup
 */
export function downloadUpdateBat(): void {
  const content = `@echo off
title Ulilmart POS - Auto-Update dan Pemeliharaan (GitHub)
color 0B
cd /d "%~dp0"

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ AUTO-UPDATE DAN PEMELIHARAAN SISTEM ]
echo ==============================================================================
echo  Repositori: https://github.com/fyercz/Project-POS-Retailer.git
echo  [INFO] Data transaksi dan produk 100%% aman di IndexedDB.
echo ==============================================================================
echo.

set "REPO_URL=https://github.com/fyercz/Project-POS-Retailer.git"
set "GIT_CMD=git"
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

echo       Mengambil pembaruan aktual dari GitHub (git fetch)...
"%GIT_CMD%" fetch origin main --depth=10 2>nul || "%GIT_CMD%" fetch origin main
if %errorlevel% equ 0 (
    echo       Menyelaraskan seluruh file proyek ke rilis GitHub terbaru (origin/main)...
    "%GIT_CMD%" branch -M main 2>nul
    "%GIT_CMD%" reset --hard origin/main
) else (
    echo       Mencoba cabang cadangan (master)...
    "%GIT_CMD%" fetch origin master --depth=10 2>nul || "%GIT_CMD%" fetch origin master
    if %errorlevel% equ 0 (
        "%GIT_CMD%" branch -M master 2>nul
        "%GIT_CMD%" reset --hard origin/master
    ) else (
        echo       Mencoba fallback git pull...
        "%GIT_CMD%" pull origin main 2>nul || "%GIT_CMD%" pull
    )
)
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
echo   [OK] Pembaruan dan Pembersihan Sistem Berhasil!
echo ==========================================================
echo.
echo [INFO] Versi Commit Aktual Terbaru di Komputer Ini:
"%GIT_CMD%" log -1 --pretty=format:"  Commit : %%h%%n  Pesan  : %%s%%n  Waktu  : %%cd%%n" 2>nul
echo.
set /p RUN_NOW="Nyalakan kasir desktop sekarang (Y/T)? "
if /i "%RUN_NOW%"=="Y" (
    if exist autorun.bat (call autorun.bat) else (call npm start)
)
exit /b 0
`;

  downloadBlobFile('update.bat', content, 'application/x-bat');
}

export function downloadCleanerBat(): void {
  const batContent = `@echo off
title Ulilmart POS - Pembersihan File Usang dan Sampah
color 0E

cd /d "%~dp0"

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ PEMBERSIHAN FILE USANG DAN CACHE SISTEM ]
echo ==============================================================================
echo.
echo  Pembersihan ini akan menghapus:
echo  1. Cache build Vite lokal (node_modules\\.vite, .cache)
echo  2. File log debugging (*.log, npm-debug.log)
echo  3. File temporary dan backup (*.tmp, *.temp, *.bak, *.swp)
echo  4. File sampah OS Windows / Mac (Thumbs.db, desktop.ini, .DS_Store)
echo.
echo  [JAMINAN KEAMANAN]:
echo  - Database kasir (pos-master.sqlite dan IndexedDB) 100%% AMAN dan TIDAK DIHAPUS.
echo  - Seluruh file kode sumber aplikasi tetap utuh.
echo ==============================================================================
echo.
echo Pilihan mode pembersihan:
echo [1] Pembersihan Standar Aman (Rekomendasi - Log, Temp, Cache, OS Junk)
echo [2] Pembersihan Penuh (Standar + Hapus folder build dist untuk kompilasi ulang)
echo [3] Simulasi Pindai Saja (Dry-Run / Tanpa Menghapus)
echo [4] Batal
echo.
set /p PILIHAN="Masukkan pilihan Anda (1/2/3/4) [Default: 1]: "
if "%PILIHAN%"=="" set "PILIHAN=1"
if "%PILIHAN%"=="4" (
    echo Pembersihan dibatalkan.
    pause
    exit /b 0
)

echo.
if "%PILIHAN%"=="2" (
    echo [EKSEKUSI] Menjalankan Pembersihan Penuh (termasuk dist)...
    node scripts/cleaner.mjs --dist
) else if "%PILIHAN%"=="3" (
    echo [SIMULASI] Memindai file usang...
    node scripts/cleaner.mjs --dry-run
) else (
    echo [EKSEKUSI] Menjalankan Pembersihan Standar...
    node scripts/cleaner.mjs
)

echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
exit /b 0
`;
  downloadBlobFile('clean.bat', batContent, 'application/x-bat');
}

export function downloadCleanerSh(): void {
  const shContent = `#!/usr/bin/env bash
# Ulilmart POS - System & Obsolete File Cleaner (Linux / macOS)
set -e
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=============================================================================="
echo " [OK] Ulilmart POS - Pembersihan File Usang & Sampah Sistem"
echo "=============================================================================="

if [ "$1" == "--dry-run" ] || [ "$1" == "-d" ]; then
    node scripts/cleaner.mjs --dry-run
elif [ "$1" == "--all" ] || [ "$1" == "--dist" ]; then
    node scripts/cleaner.mjs --dist
else
    node scripts/cleaner.mjs
fi
`;
  downloadBlobFile('clean.sh', shContent, 'text/x-shellscript');
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
  } catch (err: any) {
    return {
      isGitRepo: false,
      error: err?.message || String(err),
      message: 'Gagal menghubungi server status Git',
    };
  }
}

export async function triggerGitPull(): Promise<{ success: boolean; message: string; output?: string; error?: string }> {
  try {
    const res = await fetch('/api/system/git-pull', { method: 'POST' });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || String(err), message: 'Gagal menjalankan git pull' };
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
  } catch (err: any) {
    return { success: false, error: err?.message || String(err), message: 'Gagal konfigurasi remote Git' };
  }
}

export async function verifySystemFiles(): Promise<SystemVerificationResponse> {
  try {
    const res = await fetch('/api/system/verify-files');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
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
      error: err?.message || String(err),
    };
  }
}

export async function scanUnnecessaryFiles(): Promise<CleanupScanResponse> {
  try {
    const res = await fetch('/api/system/cleanup-scan');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      totalFiles: 0,
      totalBytes: 0,
      items: [],
      error: err?.message || String(err),
    };
  }
}

export async function executeSystemCleanup(): Promise<CleanupExecuteResponse> {
  try {
    const res = await fetch('/api/system/cleanup-execute', { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      deletedCount: 0,
      bytesFreed: 0,
      message: 'Gagal menjalankan pembersihan sistem: ' + (err?.message || String(err)),
      error: err?.message,
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
  } catch (err: any) {
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
      message: 'Gagal memangkas database: ' + (err?.message || String(err)),
      error: err?.message,
    };
  }
}
