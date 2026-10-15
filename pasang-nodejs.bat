@echo off
REM ==============================================================================
REM Ulilmart POS - Pemasang Otomatis Node.js LTS (Windows 64-bit / 32-bit)
REM Mengunduh dan memasang Node.js resmi langsung tanpa ribet, lalu menyalakan kasir.
REM ==============================================================================
title Ulilmart POS - Pemasang Otomatis Node.js
color 0B

cd /d "%~dp0"

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  P E M A S A N G   O T O M A T I S   N O D E . J S
echo ==============================================================================
echo   Aplikasi Kasir Ulilmart POS memerlukan mesin Node.js LTS untuk:
echo   1. Database lokal toko (stok barang, transaksi, scanner kasir offline)
echo   2. Layanan cetak struk nota kasir
echo.
echo   Skrip ini akan mengunduh dan memasang Node.js LTS resmi secara otomatis.
echo ==============================================================================
echo.

REM 1. Periksa apakah Node.js sudah terpasang
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Node.js sudah terpasang di komputer ini!
    for /f "tokens=*" %%v in ('node -v 2^>nul') do echo Versi: %%v
    echo.
    echo Menyalakan aplikasi kasir Ulilmart POS sekarang...
    timeout /t 2 /nobreak >nul
    if exist "UlilmartPOS.exe" (
        start "" "UlilmartPOS.exe"
    ) else if exist "autorun.bat" (
        start "" "autorun.bat"
    )
    exit /b 0
)

REM 2. Deteksi arsitektur OS
set "NODE_ARCH=x64"
if "%PROCESSOR_ARCHITECTURE%"=="x86" (
    if not defined PROCESSOR_ARCHITEW6432 set "NODE_ARCH=x86"
)

set "NODE_VER=v20.18.0"
set "NODE_MSI=node-%NODE_VER%-%NODE_ARCH%.msi"
set "NODE_URL=https://nodejs.org/dist/%NODE_VER%/%NODE_MSI%"
set "TEMP_MSI=%TEMP%\%NODE_MSI%"

echo [1/3] Memeriksa koneksi dan metode unduhan...
where winget >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Menginstal Node.js LTS resmi via Windows Package Manager (winget)...
    echo Mohon tunggu sebentar...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% equ 0 goto INSTALL_SUCCESS
    echo [!] Winget gagal atau dibatalkan, beralih ke unduhan langsung via PowerShell...
)

echo [2/3] Mengunduh installer resmi Node.js (%NODE_MSI%)...
echo URL : %NODE_URL%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Mengunduh paket installer resmi... (Mohon tunggu 1-2 menit tergantung kecepatan internet)'; (New-Object System.Net.WebClient).DownloadFile('%NODE_URL%', '%TEMP_MSI%');"

if not exist "%TEMP_MSI%" (
    echo.
    echo [PERINGATAN] Unduhan otomatis gagal.
    echo Membuka halaman unduh resmi di browser Anda...
    start "" https://nodejs.org/
    echo.
    echo Silakan klik unduh "LTS", jalankan instalasi hingga selesai,
    echo lalu klik ganda kembali "UlilmartPOS.exe".
    pause
    exit /b 1
)

echo [OK] Installer berhasil diunduh (%TEMP_MSI%).
echo.
echo [3/3] Memasang Node.js LTS ke komputer kasir...
echo Jendela instalasi Node.js akan terbuka.
echo Silakan klik: Next -> Next -> Next -> Install -> Finish.
echo.

msiexec /i "%TEMP_MSI%"

:INSTALL_SUCCESS
echo.
echo ==============================================================================
echo   [BERHASIL] Pemasangan Node.js LTS telah selesai!
echo ==============================================================================
echo   Menyalakan aplikasi kasir Ulilmart POS sekarang...
echo ==============================================================================
timeout /t 2 /nobreak >nul

if exist "UlilmartPOS.exe" (
    start "" "UlilmartPOS.exe"
) else if exist "autorun.bat" (
    start "" "autorun.bat"
)

exit /b 0
