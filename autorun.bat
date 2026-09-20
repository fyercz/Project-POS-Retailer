@echo off
REM ==============================================================================
REM Ulilmart POS - Universal Auto-Run Launcher (Windows)
REM Memeriksa dependensi, auto-install, auto-build, dan langsung membuka kasir
REM ==============================================================================
title Ulilmart POS - Cashier Auto-Run Launcher
color 0A

cd /d "%~dp0"

REM Periksa Argumen Khusus
if "%1"=="--startup" goto SETUP_STARTUP
if "%1"=="--install-startup" goto SETUP_STARTUP
if "%1"=="--remove-startup" goto REMOVE_STARTUP
if "%1"=="--shortcut" goto CREATE_SHORTCUT

echo ==========================================================
echo    🏪 Ulilmart POS - Auto-Run Cashier System
echo ==========================================================
echo.

REM 1. Periksa ketersediaan Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [PERINGATAN] Node.js belum terpasang pada komputer ini!
    echo.
    echo Aplikasi POS membutuhkan runtime Node.js LTS untuk berjalan.
    echo Apakah Anda ingin membuka situs unduhan Node.js sekarang?
    set /p OPEN_NODE="Buka https://nodejs.org/ (Y/T)? "
    if /i "%OPEN_NODE%"=="Y" (
        start "" https://nodejs.org/
    )
    echo.
    echo Silakan install Node.js lalu jalankan kembali autorun.bat ini.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [1/4] Node.js terdeteksi: %NODE_VER%

REM 2. Pastikan file konfigurasi .env ada
if not exist .env (
    echo [2/4] Menyiapkan konfigurasi environment (.env)...
    if exist .env.example (
        copy .env.example .env >nul
    ) else (
        echo GEMINI_API_KEY=> .env
    )
    echo       ✅ File .env berhasil dibuat.
) else (
    echo [2/4] File konfigurasi .env siap.
)

REM 3. Pastikan dependensi terinstal (node_modules)
if not exist node_modules (
    echo [3/4] Dependensi belum ditemukan. Menjalankan auto-install...
    echo       Mohon tunggu beberapa saat...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal menginstal dependensi. Periksa koneksi internet Anda.
        pause
        exit /b 1
    )
) else (
    echo [3/4] Dependensi node_modules siap.
)

REM 4. Pastikan build produksi tersedia (dist)
if not exist dist (
    echo [4/4] Mengompilasi aplikasi untuk mode produksi (npm run build)...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal melakukan build aplikasi.
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
echo   URL Kasir   : http://localhost:3000
echo   Mode        : Desktop App Window
echo   Status      : Server Aktif
echo   Tutup jendela ini atau tekan Ctrl+C untuk mematikan server
echo ==========================================================
echo.

set TARGET_URL=http://localhost:3000

REM Buka jendela aplikasi setelah 2 detik
start /b cmd /c "timeout /t 2 /nobreak >nul & (where msedge >nul 2>nul && start msedge --app=%TARGET_URL% || (where chrome >nul 2>nul && start chrome --app=%TARGET_URL% || start %TARGET_URL%))"

REM Jalankan server produksi
call npm start
exit /b 0

:SETUP_STARTUP
echo ==========================================================
echo    ⚙️ Mendaftarkan Auto-Start Windows (Startup Kasir)
echo ==========================================================
echo.
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\Ulilmart POS.lnk
set TARGET_BAT=%~dp0autorun.bat
set WORKING_DIR=%~dp0

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save()"
if %ERRORLEVEL% equ 0 (
    echo ✅ Berhasil! Ulilmart POS akan otomatis berjalan setiap kali komputer dinyalakan.
    echo Lokasi shortcut: %SHORTCUT_PATH%
) else (
    echo ❌ Gagal menambahkan ke folder Startup Windows.
)
echo.
pause
exit /b 0

:REMOVE_STARTUP
echo ==========================================================
echo    🗑️ Menghapus Auto-Start dari Windows Startup
echo ==========================================================
echo.
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\Ulilmart POS.lnk

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo ✅ Auto-Start berhasil dinonaktifkan.
) else (
    echo ℹ️ Shortcut Auto-Start tidak ditemukan di folder Startup.
)
echo.
pause
exit /b 0

:CREATE_SHORTCUT
echo ==========================================================
echo    📌 Membuat Shortcut Desktop
echo ==========================================================
echo.
set DESKTOP_FOLDER=%USERPROFILE%\Desktop
set SHORTCUT_PATH=%DESKTOP_FOLDER%\Ulilmart POS Kasir.lnk
set TARGET_BAT=%~dp0autorun.bat
set WORKING_DIR=%~dp0

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save()"
if %ERRORLEVEL% equ 0 (
    echo ✅ Shortcut desktop berhasil dibuat: %SHORTCUT_PATH%
) else (
    echo ❌ Gagal membuat shortcut desktop.
)
echo.
pause
exit /b 0
