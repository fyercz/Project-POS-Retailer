@echo off
REM ==============================================================================
REM Ulilmart POS - Solusi 1-Klik Perbaikan & Jalankan Kasir
REM Membersihkan port 3000, memeriksa dependensi, dan menyalakan aplikasi kasir
REM ==============================================================================
title Ulilmart POS - Perbaikan & Jalankan Kasir
color 0B

cd /d "%~dp0"

cls
echo ==============================================================================
echo   [ ULILMART POS ]  -  P E R B A I K A N   &   J A L A N K A N
echo ==============================================================================
echo   Skrip ini akan menyelesaikan kendala kasir tidak terbuka secara otomatis.
echo ==============================================================================
echo.

REM 1. Injeksi System32 dan PATH default
if exist "%SystemRoot%\System32" (
    set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\;%PATH%"
)

REM 2. Bebaskan Port 3000 dari proses zombie / macet
echo [1/4] Memeriksa dan membersihkan Port 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
echo       [OK] Port 3000 siap dan bersih.
echo.

REM 3. Periksa ketersediaan Node.js
echo [2/4] Memeriksa runtime Node.js...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
    if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
    if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;%PATH%"
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo ==============================================================================
    echo   [PERHATIAN] Runtime Node.js belum terpasang di komputer ini!
    echo ==============================================================================
    echo   Aplikasi kasir membutuhkan Node.js untuk database offline toko.
    echo.
    echo   PILIHAN:
    echo   [1] Pasang Node.js otomatis sekarang (Rekomendasi)
    echo   [2] Buka browser ke situs unduh resmi (https://nodejs.org/)
    echo   [3] Keluar
    echo.
    set /p P_NODE="Pilihan Anda (1/2/3) [Default: 1]: "
    if "%P_NODE%"=="" set "P_NODE=1"
    if "%P_NODE%"=="1" (
        if exist "pasang-nodejs.bat" (
            call "pasang-nodejs.bat"
            exit /b 0
        )
    )
    if "%P_NODE%"=="2" (
        start "" https://nodejs.org/en/download
    )
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v 2^>nul') do echo       [OK] Node.js terdeteksi: %%v
echo.

REM 4. Periksa node_modules
echo [3/4] Memeriksa modul dependensi...
if not exist "node_modules\express" (
    echo       Menginstal modul kasir (npm install)...
    echo       Mohon tunggu 1-2 menit (hanya untuk pertama kali)...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Instalasi npm gagal. Pastikan komputer terhubung ke internet.
        pause
        exit /b 1
    )
)
echo       [OK] Dependensi lengkap.
echo.

REM 5. Periksa paket produksi dist
echo [4/4] Memeriksa build kasir...
if not exist "dist\server.cjs" (
    echo       Menyiapkan build produksi (npm run build)...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal melakukan build.
        pause
        exit /b 1
    )
)
echo       [OK] Paket build siap.
echo.

echo ==============================================================================
echo   [SUKSES] Semua pemeriksaan selesai. Membuka Ulilmart POS sekarang!
echo ==============================================================================
timeout /t 2 /nobreak >nul

if exist "autorun.bat" (
    start "" "autorun.bat"
) else if exist "desktop.bat" (
    start "" "desktop.bat"
) else (
    start "" http://localhost:3000
    node dist\server.cjs
)
exit /b 0
