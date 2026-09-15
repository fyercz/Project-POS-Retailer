@echo off
REM ==============================================================================
REM Point of Sales - Desktop Application Runner (Windows)
REM Launches Ulilmart POS as a dedicated Desktop App Window (No Browser Address Bar)
REM ==============================================================================
title Ulilmart POS - Desktop Cashier Terminal
color 0A

cd /d "%~dp0"

echo ==========================================================
echo    🏪 Menjalankan Ulilmart POS (Mode Desktop Kasir)
echo ==========================================================
echo.

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

REM Prioritas 2: Google Chrome App Window Mode
where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Membuka jendela aplikasi desktop via Google Chrome...
    start "" chrome --app=%TARGET_URL%
    goto SELESAI
)

REM Prioritas 3: Browser Standar
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
