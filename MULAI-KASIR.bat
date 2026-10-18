@echo off
rem ==========================================================================
rem  Ulilmart POS - jalankan kasir (Windows)
rem    MULAI-KASIR.bat                   jalankan kasir (pertama kali: pasang otomatis)
rem    MULAI-KASIR.bat --startup         kasir menyala otomatis saat Windows dinyalakan
rem    MULAI-KASIR.bat --remove-startup  matikan auto-start
rem    MULAI-KASIR.bat --shortcut        buat ulang shortcut di Desktop
rem ==========================================================================
setlocal
title Ulilmart POS
cd /d "%~dp0"
set "PORT=3000"
set "URL=http://localhost:%PORT%"
set "STARTUP_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ulilmart POS.lnk"

if /i "%~1"=="--startup" goto AKTIFKAN_STARTUP
if /i "%~1"=="--install-startup" goto AKTIFKAN_STARTUP
if /i "%~1"=="--remove-startup" goto MATIKAN_STARTUP
if /i "%~1"=="--shortcut" goto BUAT_SHORTCUT

rem 1. Node.js
call scripts\cari-node.bat
if errorlevel 1 goto NO_NODE

rem 2. Server sudah jalan? Langsung buka kasir.
call :CEK_PORT
if not errorlevel 1 goto BUKA

rem 3. Persiapan (hanya pertama kali)
set "PERTAMA_KALI="
if not exist ".env" if exist ".env.example" copy ".env.example" ".env" >nul
if exist "node_modules\express" goto SUDAH_INSTAL
set "PERTAMA_KALI=1"
echo Memasang komponen kasir - pertama kali saja, perlu internet, 1-3 menit...
if exist package-lock.json (call npm ci --no-audit --no-fund) else (call npm install --no-audit --no-fund)
if errorlevel 1 goto GAGAL
:SUDAH_INSTAL
if exist "dist\server.cjs" goto SUDAH_BUILD
echo Menyiapkan aplikasi kasir - pertama kali saja...
call npm run build
if errorlevel 1 goto GAGAL
:SUDAH_BUILD
if defined PERTAMA_KALI call :SETELAH_INSTAL

rem 4. Nyalakan server di latar belakang (log di server.log), tunggu maks 60 detik
echo Menyalakan server kasir...
start "UlilmartPOS-Server" /min cmd /c "node dist\server.cjs >> server.log 2>&1"
for /l %%i in (1,1,60) do (
    call :CEK_PORT
    if not errorlevel 1 goto BUKA
    timeout /t 1 /nobreak >nul
)
echo [GAGAL] Server kasir tidak merespons. Isi server.log:
type server.log 2>nul
echo Coba jalankan BERHENTI-KASIR.bat lalu ulangi.
pause
exit /b 1

:BUKA
rem Buka sebagai jendela aplikasi (Edge/Chrome --app), kalau tidak ada pakai browser bawaan
set "B="
for %%P in ("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe") do (
    if not defined B if exist %%P set "B=%%~P"
)
if defined B (start "" "%B%" --app=%URL%) else (start "" %URL%)
exit /b 0

:SETELAH_INSTAL
rem Selesai pasang pertama kali: shortcut Desktop + tawarkan auto-start
call scripts\buat-shortcut.bat Desktop
echo Shortcut "Ulilmart POS" dibuat di Desktop.
if exist "%STARTUP_LNK%" exit /b 0
choice /c YT /t 20 /d T /m "Nyalakan kasir otomatis setiap Windows dinyalakan? (otomatis Tidak dalam 20 detik)"
if errorlevel 2 exit /b 0
call scripts\buat-shortcut.bat Startup
echo Auto-start aktif. Matikan kapan saja dengan: MULAI-KASIR.bat --remove-startup
exit /b 0

:CEK_PORT
powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient('127.0.0.1', %PORT%)).Close(); exit 0 } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%

:AKTIFKAN_STARTUP
call scripts\buat-shortcut.bat Startup
echo Auto-start aktif. Kasir akan menyala setiap kali Windows dinyalakan.
pause
exit /b 0

:MATIKAN_STARTUP
del /f /q "%STARTUP_LNK%" 2>nul
echo Auto-start dimatikan.
pause
exit /b 0

:BUAT_SHORTCUT
call scripts\buat-shortcut.bat Desktop
echo Shortcut "Ulilmart POS" dibuat di Desktop.
pause
exit /b 0

:NO_NODE
echo Node.js belum terpasang di komputer ini (dibutuhkan untuk menjalankan kasir).
where winget >nul 2>nul || goto NODE_MANUAL
choice /c YT /m "Pasang Node.js otomatis sekarang (perlu internet)"
if errorlevel 2 goto NODE_MANUAL
winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
call scripts\cari-node.bat
if errorlevel 1 goto NODE_MANUAL
echo Node.js berhasil dipasang. Melanjutkan...
call "%~f0"
exit /b

:NODE_MANUAL
echo Silakan pasang Node.js versi LTS dari halaman yang akan dibuka,
echo lalu jalankan MULAI-KASIR.bat lagi.
start "" https://nodejs.org/en/download
pause
exit /b 1

:GAGAL
echo [GAGAL] Lihat pesan error di atas. Pastikan internet aktif lalu coba lagi.
pause
exit /b 1
