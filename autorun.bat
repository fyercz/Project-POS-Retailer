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
    ) else if exist "%ProgramW6432%\nodejs\node.exe" (
        set "PATH=%ProgramW6432%\nodejs;%APPDATA%\npm;%PATH%"
    ) else if exist "C:\nvm\nodejs\node.exe" (
        set "PATH=C:\nvm\nodejs;%PATH%"
    ) else if exist "%NVM_SYMLINK%\node.exe" (
        set "PATH=%NVM_SYMLINK%;%PATH%"
    )
)

where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "PATH=C:\Program Files\Git\cmd;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
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
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $desk = [System.Environment]::GetFolderPath('Desktop'); $deskLnk = Join-Path $desk 'Ulilmart POS Kasir.lnk'; if (-not (Test-Path $deskLnk)) { $s1 = $ws.CreateShortcut($deskLnk); $s1.TargetPath = '%~dp0autorun.bat'; $s1.WorkingDirectory = '%~dp0'; $s1.IconLocation = '%~dp0ulilmart.ico,0'; $s1.Description = 'Ulilmart POS Kasir'; $s1.Save(); };" >nul 2>&1
)

REM 1. Periksa ketersediaan Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [PERINGATAN] Node.js belum terpasang atau belum masuk PATH!
    echo.
    echo Aplikasi POS membutuhkan runtime Node.js LTS untuk berjalan.
    echo Apakah Anda ingin membuka situs unduhan Node.js sekarang?
    set /p OPEN_NODE="Buka https://nodejs.org/ (Y/T)? "
    if /i "%OPEN_NODE%"=="Y" (
        start "" https://nodejs.org/
    )
    echo.
    echo Silakan install Node.js lalu jalankan kembali autorun.bat ini.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set "NODE_VER=%%i"
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
if not exist node_modules (
    echo [3/4] Dependensi belum ditemukan. Menjalankan auto-install...
    echo       Mohon tunggu beberapa saat...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal menginstal dependensi. Periksa koneksi internet Anda.
        pause
        exit /b 1
    )
) else (
    echo [3/4] Dependensi node_modules siap.
)

REM 4. Pastikan build produksi tersedia (dist)
if not exist dist (
    echo [4/4] Mengompilasi aplikasi untuk mode produksi (npm run build)...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal melakukan build aplikasi.
        pause
        exit /b 1
    )
) else (
    echo [4/4] Build produksi siap digunakan.
)

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

set "TARGET_URL=http://localhost:3000"

REM Buka jendela aplikasi setelah 2 detik
start /b cmd /c "timeout /t 2 /nobreak >nul & (where msedge >nul 2>nul && start msedge --app=%TARGET_URL% || (where chrome >nul 2>nul && start chrome --app=%TARGET_URL% || start %TARGET_URL%))"

REM Jalankan server produksi
call npm start
exit /b 0

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

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%WORKING_DIR%ulilmart.ico') { $s.IconLocation = '%WORKING_DIR%ulilmart.ico,0' }; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save()"
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

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%WORKING_DIR%'; if (Test-Path '%WORKING_DIR%ulilmart.ico') { $s.IconLocation = '%WORKING_DIR%ulilmart.ico,0' }; $s.Description = 'Ulilmart Point of Sales Kasir'; $s.Save()"
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
