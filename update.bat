@echo off
REM ==============================================================================
REM Ulilmart POS - Auto-Update dan Pemeliharaan Sistem (Windows)
REM ==============================================================================
title Ulilmart POS - Auto-Update dan Pemeliharaan
color 0B

cd /d "%~dp0"
set "REPO_URL=https://github.com/fyercz/Project-POS-Retailer.git"

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ AUTO-UPDATE DAN PEMELIHARAAN SISTEM ]
echo ==============================================================================
echo  Repositori Resmi : %REPO_URL%
echo.
echo  Pembaruan ini akan menarik file kode terbaru dari GitHub.
echo  [CATATAN PENTING KEAMANAN DATA]:
echo  - Seluruh data transaksi, riwayat kasir, produk, dan stok
echo    tersimpan di database lokal browser (IndexedDB dan SQLite)
echo    100%% AMAN dan TIDAK AKAN HILANG setelah update!
echo ==============================================================================
echo.

REM 1. Pembersihan file sampah dan temporary
echo [1/4] Membersihkan file-file cache dan temporary...
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
echo [2/4] Memeriksa koneksi Git dan repositori GitHub...
set "GIT_CMD=git"
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

REM Lindungi data toko (folder data) sebelum git reset --hard: cadangkan dan lepas dari index Git
set "STAMP="
if not exist "data" goto SKIP_BACKUP
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%t"
xcopy /e /i /y /q "data" "data-backup\%STAMP%" >nul
if errorlevel 1 goto BACKUP_GAGAL
echo [OK] Data toko dicadangkan ke data-backup\%STAMP%
"%GIT_CMD%" rm -r --cached --ignore-unmatch -q data 2>nul
:SKIP_BACKUP

echo [INFO] Mengambil pembaruan kode aktual dari server GitHub (git fetch)...
"%GIT_CMD%" fetch origin main --depth=10 2>nul || "%GIT_CMD%" fetch origin main
if %errorlevel% equ 0 (
    echo [INFO] Menyelaraskan seluruh file proyek ke rilis GitHub terbaru (origin/main)...
    "%GIT_CMD%" branch -M main 2>nul
    "%GIT_CMD%" reset --hard origin/main
) else (
    echo [INFO] Mencoba cabang cadangan (master)...
    "%GIT_CMD%" fetch origin master --depth=10 2>nul || "%GIT_CMD%" fetch origin master
    if %errorlevel% equ 0 (
        "%GIT_CMD%" branch -M master 2>nul
        "%GIT_CMD%" reset --hard origin/master
    ) else (
        echo [INFO] Mencoba fallback git pull...
        "%GIT_CMD%" pull origin main 2>nul || "%GIT_CMD%" pull
    )
)

REM Jika database toko tertimpa/hilang oleh update, pulihkan dari cadangan
if defined STAMP if not exist "data\pos-master.sqlite" xcopy /e /i /y /q "data-backup\%STAMP%" "data" >nul

echo.
echo [INFO] Versi Commit Aktual Terbaru di Komputer Ini:
"%GIT_CMD%" log -1 --pretty=format:"  Commit : %%h%%n  Pesan  : %%s%%n  Waktu  : %%cd%%n" 2>nul
echo.

:STEP_NPM
REM 3. Update dependencies
echo [3/4] Memeriksa dan memperbarui package dependensi (npm install)...
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
echo   [SUKSES] Ulilmart POS Berhasil Diperbarui dan Dibersihkan!
echo ==========================================================
echo.
echo  Aplikasi siap digunakan dengan kode terbaru dari GitHub.
echo.
set /p JALANKAN="Nyalakan aplikasi kasir desktop sekarang (Y/T)? "
if /i "%JALANKAN%"=="Y" (
    call autorun.bat
)
exit /b 0

:BACKUP_GAGAL
echo [ERROR] Gagal mencadangkan folder data. Update dibatalkan agar data toko aman.
pause
exit /b 1
