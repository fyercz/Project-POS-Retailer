@echo off
REM ==============================================================================
REM Ulilmart POS - Script Pembersihan File Usang dan Sampah Sistem (Windows)
REM Membersihkan cache build sementara, file log debugging, file temporary (*.tmp),
REM serta file sampah OS (.DS_Store, Thumbs.db, desktop.ini).
REM Aman, tidak menghapus database kasir maupun file kode sumber.
REM ==============================================================================
title Ulilmart POS - Pembersihan File Usang dan Sampah
color 0E

cd /d "%~dp0"

REM ==============================================================================
REM Auto-Deteksi dan Injeksi PATH: Node.js, npm, dan Windows System32
REM ==============================================================================
if exist "%SystemRoot%\System32" (
    set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\;%PATH%"
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "PATH=C:\Program Files (x86)\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "PATH=%ProgramFiles(x86)%\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "%ProgramW6432%\nodejs\node.exe" (
        set "PATH=%ProgramW6432%\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "C:\nvm\nodejs\node.exe" (
        set "PATH=C:\nvm\nodejs;%PATH%"
    ) else if exist "%NVM_SYMLINK%\node.exe" (
        set "PATH=%NVM_SYMLINK%;%PATH%"
    )
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js belum terdeteksi di PATH sistem maupun folder default!
    echo Silakan instal Node.js LTS dari https://nodejs.org/ dengan opsi "Add to PATH".
    pause
    exit /b 1
)

REM Dukungan Argumen CLI Cepat
if "%1"=="--dry-run" goto FAST_DRY
if "%1"=="-d" goto FAST_DRY
if "%1"=="--dist" goto FAST_DIST
if "%1"=="--all" goto FAST_DIST

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ PEMBERSIHAN FILE USANG DAN CACHE SISTEM ]
echo ==============================================================================
echo.
echo  Pembersihan ini akan menghapus:
echo  1. Cache build Vite lokal (node_modules\.vite, .cache)
echo  2. File log debugging (*.log, npm-debug.log)
echo  3. File temporary dan backup (*.tmp, *.temp, *.bak, *.swp)
echo  4. File sampah OS Windows / Mac (Thumbs.db, desktop.ini, .DS_Store)
echo.
echo  [JAMINAN KEAMANAN]:
echo  - Database kasir (pos-master.sqlite dan IndexedDB) 100%% AMAN dan TIDAK DIHAPUS.
echo  - Seluruh file kode sumber aplikasi tetap utuh.
echo ==============================================================================
echo.

echo Pilihan mode pembersihan:
echo [1] Pembersihan Standar Aman (Rekomendasi - Log, Temp, Cache, OS Junk)
echo [2] Pembersihan Penuh (Standar + Hapus folder build dist untuk build ulang)
echo [3] Simulasi Pindai Saja (Dry-Run / Tanpa Menghapus)
echo [4] Batal
echo.
set /p PILIHAN="Masukkan pilihan Anda (1/2/3/4) [Default: 1]: "

if "%PILIHAN%"=="" set "PILIHAN=1"
if "%PILIHAN%"=="4" goto BATAL
if "%PILIHAN%"=="3" goto FAST_DRY
if "%PILIHAN%"=="2" goto FAST_DIST

echo.
echo [EKSEKUSI] Menjalankan Pembersihan Standar...
node scripts/cleaner.mjs
goto SELESAI

:FAST_DIST
echo.
echo [EKSEKUSI] Menjalankan Pembersihan Penuh (termasuk dist)...
node scripts/cleaner.mjs --dist
goto SELESAI

:FAST_DRY
echo.
echo [SIMULASI] Memindai file usang (Dry-Run)...
node scripts/cleaner.mjs --dry-run
goto SELESAI

:BATAL
echo.
echo Pembersihan dibatalkan.
goto SELESAI

:SELESAI
echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
exit /b 0
