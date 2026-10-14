@echo off
REM ==============================================================================
REM Ulilmart POS - Desktop Application Runner (Windows)
REM Menjalankan Ulilmart POS dalam Mode Jendela Desktop Mandiri
REM ==============================================================================
title Ulilmart POS - Desktop Cashier Terminal
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
    ) else if exist "D:\Program Files\nodejs\node.exe" (
        set "PATH=D:\Program Files\nodejs;%PATH%"
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
    echo  Jika Node.js SUDAH diinstal:
    echo  - Jalankan script "perbaiki-path-nodejs.bat" untuk memperbaiki PATH otomatis.
    echo.
    echo  Jika Node.js BELUM diinstal:
    echo  - Buka https://nodejs.org/ dan unduh versi LTS.
    echo ==============================================================================
    echo.
    pause
    exit /b 1
)

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ MODE APLIKASI DESKTOP KASIR MANDIRI ]
echo ==============================================================================
echo.

REM Pasang shortcut desktop jika belum ada
if exist "%~dp0ulilmart.ico" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desk = [System.Environment]::GetFolderPath('Desktop'); $deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; if (-not (Test-Path $deskLnk)) { $s1 = $ws.CreateShortcut($deskLnk); $s1.TargetPath = '%~dp0desktop.bat'; $s1.WorkingDirectory = '%~dp0'; $s1.IconLocation = '%~dp0ulilmart.ico,0'; $s1.Description = 'Ulilmart POS Kasir'; $s1.Save(); };" >nul 2>&1
)

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

REM Periksa apakah port 3000 sudah aktif dan merespons normal
set "PORT_IN_USE=0"
set "PORT_HEALTHY=0"
set "TARGET_URL=http://localhost:3000"

netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set "PORT_IN_USE=1"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $req = [System.Net.WebRequest]::Create('http://127.0.0.1:3000/api/health'); $req.Timeout = 1500; $res = $req.GetResponse(); $res.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
    if %ERRORLEVEL% equ 0 set "PORT_HEALTHY=1"
)

if "%PORT_IN_USE%"=="1" (
    if "%PORT_HEALTHY%"=="1" (
        echo [INFO] Server kasir port 3000 sudah aktif dan merespons.
        echo [INFO] Membuka antarmuka kasir desktop...
        where msedge >nul 2>nul
        if %ERRORLEVEL% equ 0 (
            start "" msedge --app=%TARGET_URL%
        ) else (
            start "" %TARGET_URL%
        )
        exit /b 0
    ) else (
        echo [INFO] Menutup proses port 3000 yang tidak merespons...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
        timeout /t 2 /nobreak >nul
    )
)

echo [INFO] Menyalakan Server Kasir Lokal (Port 3000)...

REM Buka jendela browser / Edge app setelah 2 detik
start /b cmd /c "timeout /t 2 /nobreak >nul & (where msedge >nul 2>nul && start msedge --app=%TARGET_URL% || (where chrome >nul 2>nul && start chrome --app=%TARGET_URL% || start %TARGET_URL%))"

REM Jalankan server di jendela ini
if exist "dist\server.cjs" (
    node dist\server.cjs
) else (
    call npm start
)

set "SERVER_EXIT_CODE=%ERRORLEVEL%"
echo.
echo ==============================================================================
echo  [INFO] Sesi aplikasi kasir telah berakhir.
echo ==============================================================================
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
exit /b %SERVER_EXIT_CODE%
