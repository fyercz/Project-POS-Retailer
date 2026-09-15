@echo off
REM ==============================================================================
REM Point of Sales - Auto-Update Script (Windows)
REM ==============================================================================
title Point of Sales - Updater

echo.
echo ==========================================================
echo    Point of Sales - Auto-Update Wizard (Windows)          
echo ==========================================================
echo.

REM 1. Git pull if repository exists
if exist .git (
    where git >nul 2>nul
    if %errorlevel% equ 0 (
        echo [1/3] Menarik kode versi terbaru dari Git (git pull)...
        call git pull
    ) else (
        echo [1/3] Git tidak ditemukan di path sistem. Melewati git pull.
    )
) else (
    echo [1/3] Direktori bukan repo Git. Melewati git pull.
)

REM 2. Update dependencies
echo.
echo [2/3] Memperbarui package dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Gagal memperbarui dependencies.
    pause
    exit /b %errorlevel%
)

REM 3. Rebuild app
echo.
echo [3/3] Mengompilasi ulang aplikasi (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal mengompilasi ulang aplikasi.
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================================
echo [SUKSES] Aplikasi Berhasil Diperbarui!
echo ==========================================================
echo.
echo Silakan jalankan kembali aplikasi dengan: run.bat
echo.
pause
