@echo off
REM ==============================================================================
REM Ulilmart POS - Desktop Application Runner (Windows)
REM Launches Ulilmart POS as a dedicated Desktop App Window (No Browser Address Bar)
REM ==============================================================================
chcp 65001 >nul 2>&1
title Ulilmart POS - Desktop Cashier Terminal
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
echo               [ MODE APLIKASI DESKTOP KASIR MANDIRI ]
echo ==============================================================================
echo.

REM Pastikan shortcut berlogo resmi Ulilmart (ulilmart.ico) terpasang di Desktop & Folder
if exist "%~dp0ulilmart.ico" (
    powershell -NoProfile -Command ^
        "$ws = New-Object -ComObject WScript.Shell; " ^
        "$desk = [System.Environment]::GetFolderPath('Desktop'); " ^
        "$deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; " ^
        "if (-not (Test-Path $deskLnk)) { " ^
        "  $s1 = $ws.CreateShortcut($deskLnk); $s1.TargetPath = '%~dp0desktop.bat'; $s1.WorkingDirectory = '%~dp0'; $s1.IconLocation = '%~dp0ulilmart.ico,0'; $s1.Description = 'Ulilmart POS Kasir (Lengkap & Hemat)'; $s1.Save(); " ^
        "}; " ^
        "$localLnk = '%~dp0Ulilmart POS Kasir.lnk'; " ^
        "if (-not (Test-Path $localLnk)) { " ^
        "  $s2 = $ws.CreateShortcut($localLnk); $s2.TargetPath = '%~dp0desktop.bat'; $s2.WorkingDirectory = '%~dp0'; $s2.IconLocation = '%~dp0ulilmart.ico,0'; $s2.Description = 'Ulilmart POS Kasir (Lengkap & Hemat)'; $s2.Save(); " ^
        "};" >nul 2>&1
)

REM 1. Pastikan node_modules ada
if not exist node_modules (
    echo [INFO] Folder node_modules belum ditemukan. Menginstal dependensi...
    call npm install
)

REM 2. Pastikan build produksi ada
if not exist dist (
    echo [INFO] Mengompilasi aplikasi kasir...
    call npm run build
)

echo [INFO] Menyalakan Server Kasir Lokal (Port 3000)...
start /b "" npm start

echo [INFO] Menunggu server siap...
timeout /t 2 /nobreak >nul

set TARGET_URL=http://localhost:3000

REM Prioritas 1: Microsoft Edge App Window Mode (Bawaan Windows 10/11)
where msedge >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Membuka jendela aplikasi desktop via Microsoft Edge...
    start "" msedge --app=%TARGET_URL%
    goto SELESAI
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    echo [INFO] Membuka jendela aplikasi desktop via Microsoft Edge...
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%TARGET_URL%
    goto SELESAI
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    echo [INFO] Membuka jendela aplikasi desktop via Microsoft Edge...
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=%TARGET_URL%
    goto SELESAI
)

REM Prioritas 2: Google Chrome App Window Mode
where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Membuka jendela aplikasi desktop via Google Chrome...
    start "" chrome --app=%TARGET_URL%
    goto SELESAI
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    echo [INFO] Membuka jendela aplikasi desktop via Google Chrome...
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%TARGET_URL%
    goto SELESAI
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    echo [INFO] Membuka jendela aplikasi desktop via Google Chrome...
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app=%TARGET_URL%
    goto SELESAI
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    echo [INFO] Membuka jendela aplikasi desktop via Google Chrome...
    start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --app=%TARGET_URL%
    goto SELESAI
)

REM Prioritas 3: Browser Standar Windows
echo [INFO] Membuka di browser standar...
start "" %TARGET_URL%

:SELESAI
echo.
echo ==========================================================
echo   ✅ Aplikasi Desktop Berhasil Dibuka!
echo   📌 URL: %TARGET_URL%
echo   📌 Jangan tutup jendela command prompt ini selama kasir aktif.
echo ==========================================================
pause
