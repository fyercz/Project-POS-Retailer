@echo off
rem Ulilmart POS - pasang RILIS terbaru (tag vX.Y.Z yang lolos CI) lalu build ulang. Data toko aman.
rem   update.bat            rilis terbaru
rem   update.bat v1.0.0     pasang/kembali ke versi tertentu
rem Skrip ini berpindah ke salinan di folder TEMP (tanpa "call", tidak kembali lagi),
rem karena update.bat sendiri ikut ditimpa oleh git saat update.
if not "%~1"=="--dari-temp" (
    copy /y "%~f0" "%TEMP%\ulilmart-update.bat" >nul
    "%TEMP%\ulilmart-update.bat" --dari-temp "%~dp0" %1
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
git fetch --tags --force origin main
if errorlevel 1 goto GAGAL
rem Versi tujuan: argumen (mis. v1.0.0), atau tag rilis tertinggi, atau main bila belum ada rilis
set "TARGET=%~3"
if not defined TARGET for /f "delims=" %%v in ('git tag -l "v*" --sort=-v:refname') do if not defined TARGET set "TARGET=%%v"
if not defined TARGET set "TARGET=origin/main"
echo Memasang versi: %TARGET%
git reset --hard %TARGET%
if errorlevel 1 goto GAGAL
git branch -M main >nul 2>nul
rem Jika database toko hilang karena update, pulihkan dari cadangan
if defined STAMP if not exist "data\pos-master.sqlite" xcopy /e /i /y /q "data-backup\%STAMP%" "data" >nul
for /f "delims=" %%d in ('git describe --tags --always') do echo Versi sekarang: %%d
echo Untuk kembali ke versi sebelumnya: update.bat vX.Y.Z  (daftar: git tag -l)
:BUILD

echo [3/4] Memperbarui dependensi (npm install)...
rem npm ci = pasang PERSIS versi yang sudah diuji (package-lock.json)
if exist package-lock.json (call npm ci --no-audit --no-fund) else (call npm install --no-audit --no-fund)
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
echo [GAGAL] Node.js belum terpasang. Jalankan MULAI-KASIR.bat untuk memasangnya.
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
