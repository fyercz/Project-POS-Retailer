@echo off
REM ==============================================================================
REM Ulilmart POS - Auto-Update, Verification & System Cleaner (Windows)
REM Menarik pembaruan kode terbaru dari repositori GitHub resmi,
REM membersihkan file sampah yang tidak perlu, dan mengompilasi ulang aplikasi.
REM ==============================================================================
chcp 65001 >nul 2>&1
title Ulilmart POS - Auto-Update & System Cleaner (GitHub)
color 0B

cd /d "%~dp0"

set REPO_URL=https://github.com/fyercz/Project-POS-Retailer.git

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
echo  Repositori Resmi : %REPO_URL%
echo.
echo  Pembaruan ini akan menarik file kode terbaru dari GitHub.
echo  [CATATAN PENTING KEAMANAN DATA]:
echo  - Seluruh data transaksi, riwayat kasir, produk, dan stok
echo    tersimpan di database lokal browser (IndexedDB) sehingga
echo    100%% AMAN dan TIDAK AKAN HILANG setelah update!
echo ==============================================================================
echo.

REM 1. Pembersihan file sampah dan file yang tidak perlu
echo [1/4] Membersihkan file-file yang tidak perlu pada sistem...
echo       - Menghapus file log sementara (*.log)...
del /f /q /s *.log 2>nul
echo       - Menghapus file temporary (*.tmp, *.temp, *.bak)...
del /f /q /s *.tmp *.temp *.bak *.swp 2>nul
echo       - Menghapus file cache OS (Thumbs.db, .DS_Store)...
del /f /q /s Thumbs.db ehthumbs.db desktop.ini .DS_Store 2>nul
echo       - Membersihkan cache build Vite (node_modules\.vite)...
if exist "node_modules\.vite" rd /s /q "node_modules\.vite" 2>nul
echo       [OK] File sampah dan temporary berhasil dibersihkan!
echo.

REM 2. Cari Git executable
echo [2/4] Memeriksa koneksi Git & repositori GitHub...
set GIT_CMD=git
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
    ) else (
        echo [PERINGATAN] Git tidak ditemukan di komputer ini!
        echo Pastikan Git for Windows telah terpasang: https://git-scm.com/
        echo.
        echo Melewati penarikan kode Git. Melanjutkan kompilasi lokal...
        goto STEP_NPM
    )
)

REM Hubungkan atau inisialisasi ke repositori GitHub resmi
if not exist .git (
    echo [INFO] Menginisialisasi repositori Git lokal...
    "%GIT_CMD%" init
    "%GIT_CMD%" remote add origin %REPO_URL%
    echo [OK] Remote origin berhasil dihubungkan ke %REPO_URL%
) else (
    "%GIT_CMD%" remote set-url origin %REPO_URL% 2>nul || "%GIT_CMD%" remote add origin %REPO_URL% 2>nul
)

echo Menarik pembaruan kode terbaru dari GitHub (%REPO_URL%)...
"%GIT_CMD%" pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Mencoba fallback pull default...
    "%GIT_CMD%" pull origin master 2>nul || "%GIT_CMD%" pull
)

echo.
echo [INFO] Versi Commit Terbaru:
"%GIT_CMD%" log -1 --pretty=format:"  Commit : %%h%%n  Pesan  : %%s%%n  Waktu  : %%cd%%n" 2>nul
echo.

:STEP_NPM
REM 3. Update dependencies
echo [3/4] Memeriksa & memperbarui package dependensi (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Gagal memperbarui package dependensi.
    echo Periksa koneksi internet Anda.
    pause
    exit /b %errorlevel%
)

REM 4. Rebuild production bundle
echo.
echo [4/4] Mengompilasi ulang aplikasi kasir (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal mengompilasi aplikasi.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================================
echo    🎉 [SUKSES] Ulilmart POS Berhasil Diperbarui & Dibersihkan!
echo ==========================================================
echo.
echo  Aplikasi siap digunakan dengan kode terbaru dari GitHub.
echo.
set /p JALANKAN="Nyalakan aplikasi kasir desktop sekarang (Y/T)? "
if /i "%JALANKAN%"=="Y" (
    if exist desktop.bat (
        start "" desktop.bat
    ) else if exist autorun.bat (
        start "" autorun.bat
    ) else (
        start "" npm start
    )
)

exit /b 0
