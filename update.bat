@echo off
rem Ulilmart POS - ambil kode terbaru dari GitHub lalu build ulang. Data toko di folder data\ tetap aman.
rem Skrip ini berpindah ke salinan di folder TEMP (tanpa "call", tidak kembali lagi),
rem karena update.bat sendiri ikut ditimpa oleh git saat update.
if not "%~1"=="--dari-temp" (
    copy /y "%~f0" "%TEMP%\ulilmart-update.bat" >nul
    "%TEMP%\ulilmart-update.bat" --dari-temp "%~dp0"
)
setlocal
title Ulilmart POS - Update
cd /d "%~2"
set "REPO_URL=https://github.com/fyercz/Project-POS-Retailer.git"

call scripts\cari-node.bat
if errorlevel 1 goto NO_NODE
echo [1/4] Menghentikan server kasir yang sedang berjalan...
call BERHENTI-KASIR.bat
where git >nul 2>nul || if exist "%ProgramFiles%\Git\cmd\git.exe" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>nul || goto NO_GIT

echo [2/4] Mencadangkan data dan mengambil kode terbaru...
set "STAMP="
if not exist "data" goto FETCH
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%t"
xcopy /e /i /y /q "data" "data-backup\%STAMP%" >nul
if errorlevel 1 goto BACKUP_GAGAL
echo Data toko dicadangkan ke data-backup\%STAMP%
git rm -r --cached --ignore-unmatch -q data >nul 2>nul
:FETCH
if not exist ".git" (
    git init -q
    git remote add origin %REPO_URL%
)
git fetch origin main
if errorlevel 1 goto GAGAL
git reset --hard origin/main
if errorlevel 1 goto GAGAL
git branch -M main >nul 2>nul
rem Jika database toko hilang karena update, pulihkan dari cadangan
if defined STAMP if not exist "data\pos-master.sqlite" xcopy /e /i /y /q "data-backup\%STAMP%" "data" >nul
git log -1 --format="Versi sekarang: %%h - %%s"
:BUILD

echo [3/4] Memperbarui dependensi (npm install)...
call npm install --no-audit --no-fund
if errorlevel 1 goto GAGAL
echo [4/4] Membangun ulang aplikasi (npm run build)...
call npm run build
if errorlevel 1 goto GAGAL

echo.
echo Update selesai!
choice /c YT /m "Jalankan kasir sekarang"
if errorlevel 2 exit /b 0
call MULAI-KASIR.bat
exit /b 0

:NO_GIT
echo [PERINGATAN] Git tidak ditemukan (https://git-scm.com). Kode tidak diunduh, hanya build ulang.
goto BUILD

:NO_NODE
echo [GAGAL] Node.js belum terpasang. Jalankan pasang-nodejs.bat terlebih dahulu.
pause
exit /b 1

:BACKUP_GAGAL
echo [GAGAL] Folder data tidak bisa dicadangkan. Update dibatalkan agar data toko aman.
pause
exit /b 1

:GAGAL
echo [GAGAL] Lihat pesan error di atas. Pastikan internet aktif lalu coba lagi.
pause
exit /b 1
