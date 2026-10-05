@echo off
REM ==============================================================================
REM Ulilmart POS - Setup Auto-Run & Startup Wizard (Windows)
REM Mengonfigurasi PC Kasir agar otomatis membuka aplikasi saat komputer dinyalakan
REM ==============================================================================
chcp 65001 >nul 2>&1
title Ulilmart POS - Konfigurasi Auto-Run Kasir
color 0B

cd /d "%~dp0"

:MENU
cls
echo ==============================================================================
echo     ┌──────┐
echo     │ 🛒   │  ██╗   ██╗██╗     ██╗██╗     ███╗   ███╗ █████╗ ██████╗ ████████╗
echo     │ ───┐ │  ██║   ██║██║     ██║██║     ████╗ ████║██╔══██╗██╔══██╗╚══██╔══╝
echo     │ O  O │  ██║   ██║██║     ██║██║     ██╔████╔██║███████║██████╔╝   ██║   
echo     └──────┘  ██║   ██║██║     ██║██║     ██║╚██╔╝██║██╔══██║██╔══██╗   ██║   
echo     [LOGO]    ╚██████╔╝███████╗██║███████╗██║ ╚═╝ ██║██║  ██║██║  ██║   ██║   
echo     ULILMART   ╚═════╝ ╚══════╝╚═╝╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
echo     ┌───────────────────────────────┬───────────────────────────────┐
echo     │   🛍️  L E N G K A P           │   💰  ^&   H E M A T           │
echo     └───────────────────────────────┴───────────────────────────────┘
echo                   S M A R T   R E T A I L   P O S
echo             [ WIZARD KONFIGURASI STARTUP KASIR ]
echo ==============================================================================
echo.
echo  Pilih opsi yang Anda inginkan:
echo.
echo  [1] Aktifkan Auto-Run saat Komputer Dinyalakan
echo      (Aplikasi kasir otomatis terbuka saat PC kasir boot ke Windows)
echo.
echo  [2] Nonaktifkan Auto-Run dari Startup Windows
echo      (PC tidak akan membuka kasir otomatis saat menyala)
echo.
echo  [3] Buat Shortcut Ikon Logo Kasir Resmi di Desktop ^& Folder
echo      (Ikon logo Ulilmart resmi di desktop dan di folder aplikasi)
echo.
echo  [4] Jalankan Aplikasi Kasir Sekarang (Auto-Run)
echo.
echo  [5] Keluar
echo.
echo ==========================================================
set /p PILIHAN="Masukkan pilihan (1-5): "

if "%PILIHAN%"=="1" goto AKTIFKAN
if "%PILIHAN%"=="2" goto NONAKTIFKAN
if "%PILIHAN%"=="3" goto SHORTCUT
if "%PILIHAN%"=="4" goto JALANKAN
if "%PILIHAN%"=="5" exit /b 0

echo Pilihan tidak valid. Silakan ulangi.
timeout /t 2 >nul
goto MENU

:AKTIFKAN
cls
call autorun.bat --startup
goto MENU

:NONAKTIFKAN
cls
call autorun.bat --remove-startup
goto MENU

:SHORTCUT
cls
call buat-shortcut-logo.bat
goto MENU

:JALANKAN
call autorun.bat
goto MENU
