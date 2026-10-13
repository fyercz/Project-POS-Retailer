@echo off
REM ==============================================================================
REM Ulilmart POS - Application Runner (Windows)
REM ==============================================================================
chcp 65001 >nul 2>&1
title Ulilmart POS - Cashier Terminal
color 0A

cd /d "%~dp0"

REM ==============================================================================
REM Auto-Deteksi & Injeksi PATH: Node.js, npm, dan Windows System32
REM ==============================================================================
if exist "%SystemRoot%\System32" (
    set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\;%PATH%"
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "PATH=C:\Program Files (x86)\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "PATH=%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "%ProgramW6432%\nodejs\node.exe" (
        set "PATH=%ProgramW6432%\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "C:\nvm\nodejs\node.exe" (
        set "PATH=C:\nvm\nodejs;%PATH%"
    ) else if exist "%NVM_SYMLINK%\node.exe" (
        set "PATH=%NVM_SYMLINK%;%PATH%"
    )
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    cls
    echo ==============================================================================
    echo  [PERINGATAN] Runtime Node.js Belum Terdeteksi di Komputer Ini!
    echo ==============================================================================
    echo  Aplikasi POS membutuhkan runtime Node.js LTS untuk berjalan.
    echo.
    echo  Jika Node.js SUDAH diinstal:
    echo  - Kemungkinan lokasi instalasi belum masuk ke PATH sistem Windows.
    echo  - Jalankan script "install.bat" untuk memeriksa dan memasang ulang.
    echo.
    echo  Jika Node.js BELUM diinstal:
    echo  - Buka https://nodejs.org/ dan unduh versi LTS.
    echo  - Pastikan centang opsi "Add to PATH" saat instalasi.
    echo ==============================================================================
    echo.
    pause
    exit /b 1
)

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
echo              Lengkap - Hemat - Transaksi Kasir Cepat
echo ==============================================================================
echo.

REM Pastikan shortcut berlogo resmi Ulilmart (ulilmart.ico) terpasang di Desktop & Folder
if exist "%~dp0ulilmart.ico" (
    powershell -NoProfile -Command ^
        "$ws = New-Object -ComObject WScript.Shell; " ^
        "$desk = [System.Environment]::GetFolderPath('Desktop'); " ^
        "$deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; " ^
        "if (-not (Test-Path $deskLnk)) { " ^
        "  $s1 = $ws.CreateShortcut($deskLnk); $s1.TargetPath = '%~dp0run.bat'; $s1.WorkingDirectory = '%~dp0'; $s1.IconLocation = '%~dp0ulilmart.ico,0'; $s1.Description = 'Ulilmart POS Kasir (Lengkap & Hemat)'; $s1.Save(); " ^
        "}; " ^
        "$localLnk = '%~dp0Ulilmart POS Kasir.lnk'; " ^
        "if (-not (Test-Path $localLnk)) { " ^
        "  $s2 = $ws.CreateShortcut($localLnk); $s2.TargetPath = '%~dp0run.bat'; $s2.WorkingDirectory = '%~dp0'; $s2.IconLocation = '%~dp0ulilmart.ico,0'; $s2.Description = 'Ulilmart POS Kasir (Lengkap & Hemat)'; $s2.Save(); " ^
        "};" >nul 2>&1
)

REM 1. Check if node_modules exists
if not exist node_modules (
    echo [INFO] Folder node_modules belum ditemukan. Menjalankan auto-install...
    call install.bat
)

REM 2. Check if dist exists
if not exist dist (
    echo [INFO] Build produksi belum tersedia. Mengompilasi aplikasi...
    call npm run build
)

echo.
echo [STATUS] Menyalakan Server Aplikasi Kasir...
echo   URL Kasir Lokal: http://localhost:3000
echo   Tekan Ctrl+C untuk menutup server aplikasi
echo.

REM Open browser after 2 seconds
start "" http://localhost:3000

REM Start production server
call npm start
