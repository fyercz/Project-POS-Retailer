@echo off
REM ==============================================================================
REM Ulilmart POS - Auto-Install dan Setup Script (Windows)
REM ==============================================================================
title Ulilmart POS - Installer dan Setup Wizard
color 0A

cd /d "%~dp0"
set "REPO_URL=https://github.com/fyercz/Project-POS-Retailer.git"

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ WIZARD INSTALASI DAN PERSIAPAN SISTEM ]
echo ==============================================================================
echo  Repositori Resmi : %REPO_URL%
echo.

REM ==============================================================================
REM Auto-Deteksi dan Injeksi PATH: Node.js, npm, Git, dan Windows System32
REM ==============================================================================
if exist "%SystemRoot%\System32" (
    set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\;%PATH%"
)

where node >nul 2>nul
if %errorlevel% neq 0 (
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

echo [1/5] Memeriksa instalasi Node.js dan npm...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [PERINGATAN] Node.js belum terdeteksi di sistem ini!
    echo Silakan unduh dan instal Node.js LTS dari: https://nodejs.org/
    echo Pastikan centang opsi "Add to PATH" saat menginstal.
    echo.
    set /p BUKA_NODE="Buka halaman unduhan Node.js sekarang (Y/T)? "
    if /i "%BUKA_NODE%"=="Y" start "" https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set "NODE_VER=%%i"
for /f "tokens=*" %%i in ('npm -v') do set "NPM_VER=%%i"
echo       [OK] Node.js aktif: %NODE_VER%
echo       [OK] npm aktif    : v%NPM_VER%
echo.

echo [2/5] Memeriksa file konfigurasi .env...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo       [OK] File .env disalin dari .env.example
    ) else (
        echo GEMINI_API_KEY=> .env
        echo       [OK] File .env baru dibuat.
    )
) else (
    echo       [OK] File .env sudah ada.
)
echo.

echo [3/5] Memasang semua paket dependensi (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Gagal memasang dependensi npm.
    echo Periksa koneksi internet Anda dan coba lagi.
    pause
    exit /b %errorlevel%
)
echo       [OK] Seluruh dependensi berhasil dipasang!
echo.

echo [4/5] Mengompilasi aplikasi untuk mode produksi (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal mengompilasi aplikasi.
    pause
    exit /b %errorlevel%
)
echo       [OK] Kompilasi berhasil! Folder dist siap.
echo.

echo [5/5] Memasang shortcut desktop dengan logo resmi...
if exist "%~dp0ulilmart.ico" (
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $desk = [System.Environment]::GetFolderPath('Desktop'); $deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; $s = $ws.CreateShortcut($deskLnk); $s.TargetPath = '%~dp0autorun.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0ulilmart.ico,0'; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save();" >nul 2>&1
    echo       [OK] Shortcut resmi telah dibuat di Desktop.
)
echo.

echo ==============================================================================
echo   [SELESAI] Ulilmart POS Siap Digunakan!
echo ==============================================================================
echo.
set /p JALANKAN="Jalankan aplikasi kasir sekarang (Y/T)? "
if /i "%JALANKAN%"=="Y" (
    call autorun.bat
)
exit /b 0
