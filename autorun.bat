@echo off
REM ==============================================================================
REM Ulilmart POS - Universal Auto-Run Launcher (Windows)
REM Memeriksa dependensi, auto-install, auto-build, dan langsung membuka kasir
REM ==============================================================================
title Ulilmart POS - Cashier Auto-Run Launcher
color 0A

cd /d "%~dp0"

REM ==============================================================================
REM Auto-Deteksi dan Injeksi PATH: Node.js, npm, Git, dan Windows System32
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

where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "PATH=C:\Program Files\Git\cmd;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "PATH=C:\Program Files (x86)\Git\cmd;%PATH%"
    )
)

REM Periksa Argumen Khusus
if "%1"=="--menu" goto MENU
if "%1"=="--setup" goto MENU
if "%1"=="--startup" goto SETUP_STARTUP
if "%1"=="--install-startup" goto SETUP_STARTUP
if "%1"=="--remove-startup" goto REMOVE_STARTUP
if "%1"=="--shortcut" goto CREATE_SHORTCUT

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   Sistem Kasir Auto-Run Terminal (Lengkap dan Hemat)
echo ==============================================================================
echo.

REM Pastikan shortcut berlogo resmi Ulilmart (ulilmart.ico) terpasang di Desktop
if exist "%~dp0ulilmart.ico" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desk = [System.Environment]::GetFolderPath('Desktop'); $deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; if (-not (Test-Path $deskLnk)) { $s1 = $ws.CreateShortcut($deskLnk); $s1.TargetPath = '%~dp0autorun.bat'; $s1.WorkingDirectory = '%~dp0'; $s1.IconLocation = '%~dp0ulilmart.ico,0'; $s1.Description = 'Ulilmart POS Kasir'; $s1.Save(); };" >nul 2>&1
)

REM 1. Periksa ketersediaan Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [PERINGATAN] Node.js belum terdeteksi di System PATH maupun folder default!
    echo.
    echo Aplikasi POS membutuhkan runtime Node.js LTS untuk berjalan.
    echo.
    echo Pilihan:
    echo [1] Buka panduan perbaikan otomatis (perbaiki-path-nodejs.bat)
    echo [2] Buka situs resmi Node.js (https://nodejs.org/)
    echo [3] Keluar
    echo.
    set /p PILIH_NODE="Masukkan pilihan (1/2/3) [Default: 1]: "
    if "%PILIH_NODE%"=="" set "PILIH_NODE=1"
    if "%PILIH_NODE%"=="1" (
        if exist "%~dp0perbaiki-path-nodejs.bat" (
            call "%~dp0perbaiki-path-nodejs.bat"
            exit /b 0
        )
    )
    if "%PILIH_NODE%"=="2" (
        start "" https://nodejs.org/
    )
    echo.
    echo Tekan tombol apa saja untuk menutup jendela ini...
    pause >nul
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v 2^>nul') do set "NODE_VER=%%i"
echo [1/4] Node.js terdeteksi: %NODE_VER%

REM 2. Pastikan file konfigurasi .env ada
if not exist .env (
    echo [2/4] Menyiapkan konfigurasi environment (.env)...
    if exist .env.example (
        copy .env.example .env >nul
    ) else (
        echo GEMINI_API_KEY=> .env
    )
    echo       [OK] File .env berhasil dibuat.
) else (
    echo [2/4] File konfigurasi .env siap.
)

REM 3. Pastikan dependensi terinstal (node_modules)
if not exist "node_modules" goto DO_INSTALL
if not exist "node_modules\express" goto DO_INSTALL
goto INSTALL_READY

:DO_INSTALL
echo [3/4] Dependensi belum lengkap. Menjalankan auto-install (npm install)...
echo       Mohon tunggu beberapa saat...
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Gagal menginstal dependensi npm. Periksa koneksi internet Anda.
    echo Tekan tombol apa saja untuk keluar...
    pause >nul
    exit /b 1
)

:INSTALL_READY
echo [3/4] Dependensi node_modules siap.

REM 4. Pastikan build produksi tersedia (dist/server.cjs & dist/index.html)
if not exist "dist\server.cjs" goto DO_BUILD
if not exist "dist\index.html" goto DO_BUILD
goto BUILD_READY

:DO_BUILD
echo [4/4] Mengompilasi aplikasi untuk mode produksi (npm run build)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Gagal melakukan build aplikasi.
    echo Tekan tombol apa saja untuk keluar...
    pause >nul
    exit /b 1
)

:BUILD_READY
echo [4/4] Paket produksi siap digunakan.

REM ==============================================================================
REM Periksa apakah Server Port 3000 sudah aktif sebelumnya
REM ==============================================================================
set "PORT_IN_USE=0"
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul 2>nul
if %ERRORLEVEL% equ 0 set "PORT_IN_USE=1"

set "TARGET_URL=http://localhost:3000"

if "%PORT_IN_USE%"=="1" (
    echo.
    echo ==============================================================================
    echo   [INFO] Server Kasir Ulilmart SUDAH AKTIF di port 3000!
    echo ==============================================================================
    echo   Aplikasi kasir sudah berjalan di latar belakang komputer Anda.
    echo   Membuka antarmuka kasir sekarang...
    echo ==============================================================================
    echo.
    
    where msedge >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        start "" msedge --app=%TARGET_URL%
    ) else (
        where chrome >nul 2>nul
        if %ERRORLEVEL% equ 0 (
            start "" chrome --app=%TARGET_URL%
        ) else (
            start "" %TARGET_URL%
        )
    )
    
    echo Pilih tindakan:
    echo [1] Buka tab baru di browser default
    echo [2] Matikan proses port 3000 lalu mulai ulang server
    echo [3] Selesai / Biarkan server tetap berjalan
    echo.
    set /p ACT_PORT="Masukkan pilihan (1/2/3) [Default: 3]: "
    if "%ACT_PORT%"=="" set "ACT_PORT=3"
    if "%ACT_PORT%"=="1" (
        start "" %TARGET_URL%
        exit /b 0
    )
    if "%ACT_PORT%"=="2" (
        echo [PROSES] Menghentikan proses yang menggunakan port 3000...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
        timeout /t 1 /nobreak >nul
        goto START_SERVER
    )
    exit /b 0
)

:START_SERVER
echo.
echo ==========================================================
echo    [*] Memulai Server Kasir Lokal (Port 3000)
echo ==========================================================
echo   URL Kasir   : http://localhost:3000
echo   Mode        : Desktop App Window
echo   Status      : Server Aktif
echo   Tutup jendela ini atau tekan Ctrl+C untuk mematikan server
echo ==========================================================
echo.

REM Buka jendela aplikasi setelah 2 detik
start /b cmd /c "timeout /t 2 /nobreak >nul & (where msedge >nul 2>nul && start msedge --app=%TARGET_URL% || (where chrome >nul 2>nul && start chrome --app=%TARGET_URL% || start %TARGET_URL%))"

REM Jalankan server produksi secara langsung
if exist "dist\server.cjs" (
    node dist\server.cjs
) else (
    call npm start
)

set "SERVER_EXIT_CODE=%ERRORLEVEL%"
echo.
echo ==============================================================================
if %SERVER_EXIT_CODE% neq 0 (
    echo  [PERINGATAN] Server kasir berhenti dengan kode status: %SERVER_EXIT_CODE%
    echo.
    echo  Kemungkinan penyebab:
    echo  1. Port 3000 sedang terkunci oleh proses lain.
    echo  2. Jendela terminal sebelumnya belum ditutup.
    echo  3. Database SQLite sedang terkunci oleh aplikasi lain.
) else (
    echo  [INFO] Server kasir telah dinonaktifkan secara normal.
)
echo ==============================================================================
echo.
echo Jendela ini ditahan agar Anda dapat membaca pesan error di atas.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
exit /b %SERVER_EXIT_CODE%

:SETUP_STARTUP
cls
echo ==========================================================
echo    [*] Mendaftarkan Auto-Start Windows (Startup Kasir)
echo ==========================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\Ulilmart POS.lnk"
set "TARGET_BAT=%~dp0autorun.bat"
set "WORKING_DIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%WORKING_DIR%ulilmart.ico') { $s.IconLocation = '%WORKING_DIR%ulilmart.ico,0' }; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save()"
if %ERRORLEVEL% equ 0 (
    echo [OK] Berhasil! Ulilmart POS akan otomatis berjalan setiap kali komputer dinyalakan.
    echo Lokasi shortcut: %SHORTCUT_PATH%
) else (
    echo [ERROR] Gagal menambahkan ke folder Startup Windows.
)
echo.
pause
exit /b 0

:REMOVE_STARTUP
cls
echo ==========================================================
echo    [*] Menghapus Auto-Start dari Windows Startup
echo ==========================================================
echo.
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\Ulilmart POS.lnk"

if exist "%SHORTCUT_PATH%" (
    del /f /q "%SHORTCUT_PATH%"
    echo [OK] Auto-Start berhasil dinonaktifkan.
) else (
    echo [INFO] Shortcut Auto-Start tidak ditemukan di folder Startup.
)
echo.
pause
exit /b 0

:CREATE_SHORTCUT
cls
echo ==========================================================
echo    [*] Membuat Shortcut Desktop
echo ==========================================================
echo.
set "DESKTOP_FOLDER=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_FOLDER%\Ulilmart POS Kasir.lnk"
set "TARGET_BAT=%~dp0autorun.bat"
set "WORKING_DIR=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%WORKING_DIR%ulilmart.ico') { $s.IconLocation = '%WORKING_DIR%ulilmart.ico,0' }; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save()"
if %ERRORLEVEL% equ 0 (
    echo [OK] Shortcut desktop berhasil dibuat: %SHORTCUT_PATH%
) else (
    echo [ERROR] Gagal membuat shortcut desktop.
)
echo.
pause
exit /b 0

:MENU
cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  S M A R T   R E T A I L   P O S
echo   [ WIZARD KONFIGURASI STARTUP KASIR ]
echo ==============================================================================
echo.
echo  Pilih opsi yang Anda inginkan:
echo.
echo  [1] Aktifkan Auto-Run saat Komputer Dinyalakan (Windows Startup)
echo  [2] Nonaktifkan Auto-Run dari Startup Windows
echo  [3] Pasang Shortcut Logo Resmi di Desktop
echo  [4] Jalankan Aplikasi Kasir Sekarang
echo  [5] Keluar
echo.
echo ==============================================================================
set /p PILIHAN="Masukkan pilihan (1-5): "

if "%PILIHAN%"=="1" goto DO_STARTUP
if "%PILIHAN%"=="2" goto DO_REMOVE_STARTUP
if "%PILIHAN%"=="3" goto DO_CREATE_SHORTCUT
if "%PILIHAN%"=="4" goto DO_RUN_APP
if "%PILIHAN%"=="5" goto EXIT_SCRIPT
goto MENU

:DO_STARTUP
cls
call "%~dp0autorun.bat" --startup
goto MENU

:DO_REMOVE_STARTUP
cls
call "%~dp0autorun.bat" --remove-startup
goto MENU

:DO_CREATE_SHORTCUT
cls
call "%~dp0autorun.bat" --shortcut
goto MENU

:DO_RUN_APP
cls
call "%~dp0autorun.bat"
exit /b 0

:EXIT_SCRIPT
exit /b 0
