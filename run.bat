@echo off
REM ==============================================================================
REM Point of Sales - Application Runner (Windows)
REM ==============================================================================
title Point of Sales - Cashier Terminal

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
echo ==========================================================
echo    🏪 Menjalankan Point of Sales Toko Retail             
echo ==========================================================
echo.
echo   URL Kasir Lokal: http://localhost:3000
echo   Tekan Ctrl+C untuk menutup server aplikasi
echo.

REM Open browser after 2 seconds
start "" http://localhost:3000

REM Start production server
call npm start
