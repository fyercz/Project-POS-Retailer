@echo off
REM ==============================================================================
REM Ulilmart POS - Script Pembersihan File Usang & Sampah Sistem (Windows)
REM Membersihkan cache build sementara, file log debugging, file temporary (*.tmp),
REM serta file sampah OS (.DS_Store, Thumbs.db, desktop.ini).
REM Aman, tidak menghapus database kasir maupun file kode sumber.
REM ==============================================================================
chcp 65001 >nul 2>&1
title Ulilmart POS - Pembersihan File Usang & Sampah
color 0E

cd /d "%~dp0"

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
echo            [ PEMBERSIHAN FILE USANG & CACHE SISTEM ]
echo ==============================================================================
echo.
echo  Pembersihan ini akan menghapus:
echo  1. Cache build Vite lokal (node_modules\.vite, .cache)
echo  2. File log debugging (*.log, npm-debug.log)
echo  3. File temporary & backup (*.tmp, *.temp, *.bak, *.swp)
echo  4. File sampah OS Windows / Mac (Thumbs.db, desktop.ini, .DS_Store)
echo.
echo  [JAMINAN KEAMANAN]:
echo  - Database kasir (pos-master.sqlite & IndexedDB) 100%% AMAN dan TIDAK DIHAPUS.
echo  - Seluruh file kode sumber aplikasi tetap utuh.
echo ==============================================================================
echo.

REM Pilihan mode
echo Pilihan mode pembersihan:
echo [1] Pembersihan Standar Aman (Rekomendasi - Log, Temp, Cache & OS Junk)
echo [2] Pembersihan Penuh (Standar + Hapus folder build dist/ untuk kompilasi ulang)
echo [3] Simulasi Pindai Saja (Dry-Run / Tanpa Menghapus)
echo [4] Batal
echo.
set /p PILIHAN="Masukkan pilihan Anda (1/2/3/4) [Default: 1]: "

if "%PILIHAN%"=="" set PILIHAN=1
if "%PILIHAN%"=="4" (
    echo.
    echo Pembersihan dibatalkan.
    pause
    exit /b 0
)

echo.
if "%PILIHAN%"=="2" (
    echo [EKSEKUSI] Menjalankan Pembersihan Penuh (termasuk dist)...
    node scripts/cleaner.mjs --dist
) else if "%PILIHAN%"=="3" (
    echo [SIMULASI] Memindai file usang...
    node scripts/cleaner.mjs --dry-run
) else (
    echo [EKSEKUSI] Menjalankan Pembersihan Standar...
    node scripts/cleaner.mjs
)

echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
exit /b 0
