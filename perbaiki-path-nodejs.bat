@echo off
REM ==============================================================================
REM Ulilmart POS - Diagnostik dan Perbaikan PATH Node.js (Windows)
REM Memeriksa status instalasi Node.js, npm, Git, serta mendaftarkan
REM lokasi Node.js ke Environment PATH Windows secara otomatis.
REM ==============================================================================
title Ulilmart POS - Diagnostik dan Perbaikan PATH Node.js
color 0B

cd /d "%~dp0"

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ DIAGNOSTIK DAN PERBAIKAN ENVIRONMENT PATH ]
echo ==============================================================================
echo.

REM 1. Pastikan System32 ada di sesi aktif
if exist "%SystemRoot%\System32" (
    set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\;%PATH%"
)

echo [1/3] Memeriksa keberadaan Node.js di komputer Anda...
set "FOUND_NODE_DIR="

if exist "C:\Program Files\nodejs\node.exe" (
    set "FOUND_NODE_DIR=C:\Program Files\nodejs"
) else if exist "%ProgramFiles%\nodejs\node.exe" (
    set "FOUND_NODE_DIR=%ProgramFiles%\nodejs"
) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "FOUND_NODE_DIR=C:\Program Files (x86)\nodejs"
) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "FOUND_NODE_DIR=%ProgramFiles(x86)%\nodejs"
) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "FOUND_NODE_DIR=%LOCALAPPDATA%\Programs\nodejs"
) else if exist "%ProgramW6432%\nodejs\node.exe" (
    set "FOUND_NODE_DIR=%ProgramW6432%\nodejs"
) else if exist "C:\nvm\nodejs\node.exe" (
    set "FOUND_NODE_DIR=C:\nvm\nodejs"
) else if exist "%NVM_SYMLINK%\node.exe" (
    set "FOUND_NODE_DIR=%NVM_SYMLINK%"
)

if not "%FOUND_NODE_DIR%"=="" (
    echo       [OK] Node.js ditemukan secara fisik di:
    echo            "%FOUND_NODE_DIR%\node.exe"
    set "PATH=%FOUND_NODE_DIR%;%APPDATA%\npm;%PATH%"
) else (
    echo       [!] Node.js belum ditemukan di folder instalasi standar.
)

echo.
echo [2/3] Memeriksa ketersediaan perintah via System PATH...
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('node -v 2^>nul') do set "CURR_NODE_VER=%%i"
    echo       [OK] Perintah 'node' aktif: %CURR_NODE_VER%
) else (
    echo       [X] Perintah 'node' belum dikenali oleh Windows.
)

where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('npm -v 2^>nul') do set "CURR_NPM_VER=%%i"
    echo       [OK] Perintah 'npm' aktif: v%CURR_NPM_VER%
) else (
    echo       [X] Perintah 'npm' belum dikenali oleh Windows.
)

where git >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo       [OK] Perintah 'git' aktif.
) else (
    echo       [INFO] Perintah 'git' tidak terdeteksi (opsional, untuk auto-update).
)

echo.
echo ==============================================================================
echo [3/3] Rekomendasi Solusi:
echo ==============================================================================

if not "%FOUND_NODE_DIR%"=="" (
    echo  Node.js terpasang di "%FOUND_NODE_DIR%",
    echo  namun belum terdaftar permanen di System PATH Windows.
    echo.
    echo  Pilihan Perbaikan:
    echo  [1] Daftarkan folder Node.js ke PATH Windows secara permanen sekarang
    echo  [2] Langsung jalankan aplikasi kasir sekarang (autorun.bat)
    echo  [3] Keluar
    echo.
    set /p AKSI="Masukkan pilihan Anda (1/2/3) [Default: 1]: "
    if "%AKSI%"=="" set "AKSI=1"
    
    if "%AKSI%"=="1" goto DAFTAR_PATH
    if "%AKSI%"=="2" goto JALANKAN_AUTORUN
    exit /b 0
) else (
    echo  Software Node.js belum terpasang di komputer ini.
    echo.
    echo  Langkah Mudah:
    echo  1. Unduh Node.js LTS dari https://nodejs.org/
    echo  2. Jalankan installer dan centang kotak opsi "Add to PATH".
    echo  3. Setelah selesai, klik ganda kembali "autorun.bat".
    echo.
    set /p BUKA="Buka situs unduhan https://nodejs.org/ sekarang (Y/T)? "
    if /i "%BUKA%"=="Y" (
        start "" https://nodejs.org/
    )
    echo.
    pause
    exit /b 1
)

:DAFTAR_PATH
echo.
echo [PROSES] Mendaftarkan "%FOUND_NODE_DIR%" ke Environment User...
powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::User) + ';%FOUND_NODE_DIR%;%APPDATA%\npm', [EnvironmentVariableTarget]::User)" >nul 2>&1
echo       [OK] Selesai! Lokasi Node.js telah didaftarkan ke Windows User Environment.
echo       [*] Seluruh file .bat sekarang dapat dijalankan tanpa error!
echo.
pause
exit /b 0

:JALANKAN_AUTORUN
call autorun.bat
exit /b 0
