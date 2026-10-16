@echo off
rem Pasang Node.js LTS otomatis (lewat winget), lalu jalankan kasir.
title Ulilmart POS - Pasang Node.js
cd /d "%~dp0"
call scripts\cari-node.bat
if not errorlevel 1 (echo Node.js sudah terpasang. & goto JALANKAN)

where winget >nul 2>nul || goto MANUAL
echo Memasang Node.js LTS, mohon tunggu...
winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
call scripts\cari-node.bat
if errorlevel 1 goto MANUAL

:JALANKAN
start "" "%~dp0MULAI-KASIR.bat"
exit /b 0

:MANUAL
echo Pemasangan otomatis gagal. Halaman unduhan Node.js akan dibuka:
echo pilih versi LTS, pasang sampai selesai, lalu jalankan MULAI-KASIR.bat
start "" https://nodejs.org/en/download
pause
exit /b 1
