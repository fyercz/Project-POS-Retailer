@echo off
REM ==============================================================================
REM Ulilmart POS - Auto-Install & Repository Setup Script (Windows)
REM ==============================================================================
title Ulilmart POS - Installer & Setup Wizard
color 0A

cd /d "%~dp0"
set REPO_URL=https://github.com/fyercz/Project-POS-Retailer.git

echo.
echo ==========================================================
echo    🏪 Ulilmart POS - Windows Installation Wizard           
echo ==========================================================
echo  Repositori Resmi : %REPO_URL%
echo.

REM 1. Check Node.js
echo [1/5] Memeriksa instalasi Node.js dan npm...
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

REM 2. Check Git & Configure Official Repository
echo.
echo [2/5] Memeriksa instalasi Git & konfigurasi repositori...
set GIT_CMD=git
where git >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
)
where %GIT_CMD% >nul 2>nul
if %errorlevel% equ 0 (
    if not exist .git (
        echo [INFO] Menginisialisasi repositori Git lokal...
        "%GIT_CMD%" init
        "%GIT_CMD%" remote add origin %REPO_URL%
    ) else (
        "%GIT_CMD%" remote set-url origin %REPO_URL% 2>nul || "%GIT_CMD%" remote add origin %REPO_URL% 2>nul
    )
    echo [OK] Repositori terhubung ke %REPO_URL%
) else (
    echo [INFO] Git belum terpasang. Anda tetap dapat menjalankan aplikasi secara lokal.
)

REM 3. Check .env
echo.
echo [3/5] Memeriksa file konfigurasi environment (.env)...
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

REM 4. Install packages
echo.
echo [4/5] Menginstal package dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Gagal menginstal dependencies.
    pause
    exit /b %errorlevel%
)

REM 5. Build application
echo.
echo [5/5] Mengompilasi aplikasi untuk produksi (npm run build)...
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
echo   - Mode Desktop Kasir : desktop.bat
echo   - Mode Server Kasir  : run.bat
echo   - Auto-Update GitHub : update.bat
echo.
echo URL Akses Kasir: http://localhost:3000
echo.
pause
