@echo off
setlocal
title Ulilmart POS - Instalasi
cd /d "%~dp0"

call scripts\cari-node.bat
if errorlevel 1 goto NO_NODE
for /f %%v in ('node -v') do echo Node.js %%v ditemukan.
if not exist ".env" if exist ".env.example" copy ".env.example" ".env" >nul

echo [1/3] Memasang dependensi (npm install)...
call npm install --no-audit --no-fund
if errorlevel 1 goto GAGAL
echo [2/3] Membangun aplikasi (npm run build)...
call npm run build
if errorlevel 1 goto GAGAL
echo [3/3] Membuat shortcut di Desktop...
call scripts\buat-shortcut.bat Desktop

echo.
echo Instalasi selesai!
choice /c YT /m "Jalankan kasir sekarang"
if errorlevel 2 exit /b 0
call MULAI-KASIR.bat
exit /b 0

:NO_NODE
echo [GAGAL] Node.js belum terpasang. Jalankan pasang-nodejs.bat terlebih dahulu.
pause
exit /b 1

:GAGAL
echo [GAGAL] Lihat pesan error di atas. Pastikan internet aktif lalu coba lagi.
pause
exit /b 1
