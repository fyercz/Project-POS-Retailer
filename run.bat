@echo off
REM ==============================================================================
REM Ulilmart POS - Application Runner (Windows)
REM ==============================================================================
title Ulilmart POS - Cashier Terminal
color 0A

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
    ) else if exist "%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe" (
        set "PATH=%USERPROFILE%\AppData\Local\Programs\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "%ProgramW6432%\nodejs\node.exe" (
        set "PATH=%ProgramW6432%\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "C:\nvm\nodejs\node.exe" (
        set "PATH=C:\nvm\nodejs;%PATH%"
    ) else if exist "%NVM_SYMLINK%\node.exe" (
        set "PATH=%NVM_SYMLINK%;%PATH%"
    ) else if exist "%USERPROFILE%\AppData\Roaming\nvm\current\node.exe" (
        set "PATH=%USERPROFILE%\AppData\Roaming\nvm\current;%PATH%"
    ) else if exist "C:\ProgramData\chocolatey\bin\node.exe" (
        set "PATH=C:\ProgramData\chocolatey\bin;%PATH%"
    ) else if exist "C:\nodejs\node.exe" (
        set "PATH=C:\nodejs;%PATH%"
    ) else if exist "D:\nodejs\node.exe" (
        set "PATH=D:\nodejs;%PATH%"
    )
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    cls
    echo ==============================================================================
    echo  [PERINGATAN] Runtime Node.js Belum Terdeteksi di Komputer Ini!
    echo ==============================================================================
    echo  Aplikasi POS membutuhkan runtime Node.js LTS untuk berjalan.
    echo.
    echo  Jalankan "perbaiki-path-nodejs.bat" untuk memperbaiki PATH otomatis.
    echo ==============================================================================
    echo.
    pause
    exit /b 1
)

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ CASHIER TERMINAL RUNNER ]
echo ==============================================================================
echo.

REM 1. Cek dan siapkan file .env jika belum ada
if not exist .env (
    echo [INFO] Menyiapkan file konfigurasi .env...
    if exist .env.example (
        copy .env.example .env >nul
    ) else (
        echo GEMINI_API_KEY=> .env
    )
)

REM 2. Cek apakah node_modules dan dist sudah ada
if not exist "node_modules\express" (
    echo [INFO] Menginstal dependensi pertama kali (npm install)...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal menginstal dependensi.
        pause
        exit /b 1
    )
)

if not exist "dist\server.cjs" (
    echo [INFO] Mengompilasi aplikasi kasir (npm run build)...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal kompilasi aplikasi.
        pause
        exit /b 1
    )
)

REM Periksa apakah port 3000 sudah aktif
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Server kasir port 3000 sudah aktif di komputer ini.
    echo [INFO] Membuka jendela browser kasir...
    start "" http://localhost:3000
    echo Tekan tombol apa saja untuk menutup...
    pause >nul
    exit /b 0
)

echo.
echo ==============================================================================
echo  Menyalakan server kasir di http://localhost:3000...
echo  Tekan Ctrl+C untuk mematikan server.
echo ==============================================================================
echo.

start "" http://localhost:3000

if exist "dist\server.cjs" (
    node dist\server.cjs
) else (
    call npm start
)

set "SERVER_EXIT_CODE=%ERRORLEVEL%"
echo.
echo ==============================================================================
echo  [INFO] Server kasir telah dinonaktifkan.
echo ==============================================================================
pause
exit /b %SERVER_EXIT_CODE%
