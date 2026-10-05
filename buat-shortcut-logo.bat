@echo off
REM ==============================================================================
REM Ulilmart POS - Generator Shortcut Berlogo Resmi (Windows)
REM Membuat shortcut aplikasi dengan ikon logo Ulilmart (ulilmart.ico)
REM di Desktop, Folder Aplikasi, dan Startup Windows.
REM ==============================================================================
chcp 65001 >nul 2>&1
title Ulilmart POS - Generator Shortcut Berlogo Resmi
color 0B

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
echo          [ PEMBUAT SHORTCUT DENGAN IKON LOGO RESMI ULILMART ]
echo ==============================================================================
echo.

set "ICON_FILE=%~dp0ulilmart.ico"
set "DESKTOP_BAT=%~dp0desktop.bat"
set "RUN_BAT=%~dp0run.bat"
set "WORKING_DIR=%~dp0"

if not exist "%ICON_FILE%" (
    echo [PERINGATAN] File ikon logo "%ICON_FILE%" tidak ditemukan.
    echo Pastikan file ulilmart.ico berada satu folder dengan script ini.
    echo.
)

echo Memasang shortcut berlogo resmi Ulilmart...
echo.

REM 1. Shortcut di Desktop Pengguna (Mode Desktop Kasir)
echo [1/3] Membuat shortcut di Desktop Windows dengan logo Ulilmart...
powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$desk = [System.Environment]::GetFolderPath('Desktop'); " ^
    "$s = $ws.CreateShortcut(\"$desk\Ulilmart POS Kasir.lnk\"); " ^
    "$s.TargetPath = '%DESKTOP_BAT%'; " ^
    "$s.WorkingDirectory = '%WORKING_DIR%'; " ^
    "if (Test-Path '%ICON_FILE%') { $s.IconLocation = '%ICON_FILE%,0' }; " ^
    "$s.Description = 'Ulilmart POS Kasir Ritel Mandiri (Lengkap & Hemat)'; " ^
    "$s.Save();"

if %ERRORLEVEL% equ 0 (
    echo       ✅ Shortcut Desktop berhasil dibuat dengan logo: "Ulilmart POS Kasir.lnk"
) else (
    echo       ⚠️ Gagal membuat shortcut Desktop.
)

REM 2. Shortcut di Folder Aplikasi Saat Ini (Kemudahan Akses Berlogo)
echo.
echo [2/3] Membuat shortcut di folder aplikasi saat ini dengan logo...
powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; " ^
    "$s = $ws.CreateShortcut('%~dp0Ulilmart POS Kasir.lnk'); " ^
    "$s.TargetPath = '%DESKTOP_BAT%'; " ^
    "$s.WorkingDirectory = '%WORKING_DIR%'; " ^
    "if (Test-Path '%ICON_FILE%') { $s.IconLocation = '%ICON_FILE%,0' }; " ^
    "$s.Description = 'Ulilmart POS Kasir Ritel Mandiri (Lengkap & Hemat)'; " ^
    "$s.Save();"

if %ERRORLEVEL% equ 0 (
    echo       ✅ Shortcut folder lokal berhasil dibuat dengan logo: "%~dp0Ulilmart POS Kasir.lnk"
) else (
    echo       ⚠️ Gagal membuat shortcut folder lokal.
)

REM 3. Menerapkan Ikon Logo ke Folder Aplikasi (Windows Explorer)
echo.
echo [3/3] Mengonfigurasi ikon logo pada folder aplikasi (desktop.ini)...
if exist "%~dp0desktop.ini" (
    attrib +s +h "%~dp0desktop.ini" >nul 2>&1
    attrib +r "%~dp0" >nul 2>&1
    echo       ✅ Ikon folder berhasil dikonfigurasi ke ulilmart.ico
) else (
    echo       ℹ️ desktop.ini dilewati.
)

echo.
echo ==============================================================================
echo   🎉 SELESAI! Shortcut berlogo resmi Ulilmart telah terpasang:
echo.
echo   📌 Di Desktop        : "Ulilmart POS Kasir.lnk" (Tampilan Ikon Logo Ulilmart)
echo   📌 Di Folder Ini     : "Ulilmart POS Kasir.lnk" (Klik ganda untuk membuka kasir)
echo   📌 Target Eksekusi   : %DESKTOP_BAT%
echo.
echo   Anda sekarang dapat langsung mengeklik ikon logo Ulilmart untuk menjalankan POS!
echo ==============================================================================
echo.
pause
