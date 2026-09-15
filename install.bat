@echo off
REM ==============================================================================
REM Point of Sales - Auto-Install Script (Windows)
REM ==============================================================================
title Point of Sales - Installer

echo.
echo ==========================================================
echo    Point of Sales - Windows Installation Wizard           
echo ==========================================================
echo.

REM 1. Check Node.js
echo [1/4] Memeriksa instalasi Node.js dan npm...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terpasang di komputer ini!
    echo Silakan unduh dan pasang Node.js LTS dari: https://nodejs.org/
    echo Setelah instalasi selesai, jalankan kembali script ini.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js terdeteksi: %NODE_VER%

REM 2. Check .env
echo.
echo [2/4] Memeriksa file konfigurasi environment (.env)...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] Berhasil membuat file .env dari .env.example
    ) else (
        echo GEMINI_API_KEY=> .env
        echo [OK] File .env baru telah dibuat
    )
) else (
    echo [OK] File .env sudah ada
)

REM 3. Install packages
echo.
echo [3/4] Menginstal package dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Gagal menginstal dependencies.
    pause
    exit /b %errorlevel%
)

REM 4. Build application
echo.
echo [4/4] Mengompilasi aplikasi untuk produksi (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal melakukan build aplikasi.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================================
echo [SUKSES] Instalasi Selesai!
echo ==========================================================
echo.
echo Untuk menjalankan aplikasi:
echo   - Klik ganda file: run.bat
echo   - Atau ketik di Command Prompt: run.bat
echo.
echo URL Akses Kasir: http://localhost:3000
echo.
pause
