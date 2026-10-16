@echo off
setlocal
title Ulilmart POS
cd /d "%~dp0"
set "PORT=3000"
set "URL=http://localhost:%PORT%"

rem 1. Node.js
call scripts\cari-node.bat
if errorlevel 1 goto NO_NODE

rem 2. Server sudah jalan? Langsung buka kasir.
call :CEK_PORT
if not errorlevel 1 goto BUKA

rem 3. Persiapan (hanya pertama kali)
if not exist ".env" if exist ".env.example" copy ".env.example" ".env" >nul
if exist "node_modules\express" goto SUDAH_INSTAL
echo Memasang komponen kasir - pertama kali saja, perlu internet, 1-3 menit...
call npm install --no-audit --no-fund
if errorlevel 1 goto GAGAL
:SUDAH_INSTAL
if exist "dist\server.cjs" goto SUDAH_BUILD
echo Menyiapkan aplikasi kasir - pertama kali saja...
call npm run build
if errorlevel 1 goto GAGAL
:SUDAH_BUILD

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
echo Coba jalankan perbaiki-dan-jalankan.bat
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

:CEK_PORT
powershell -NoProfile -Command "try { (New-Object Net.Sockets.TcpClient('127.0.0.1', %PORT%)).Close(); exit 0 } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%

:NO_NODE
echo [GAGAL] Node.js belum terpasang. Jalankan pasang-nodejs.bat atau unduh LTS dari https://nodejs.org
pause
exit /b 1

:GAGAL
echo [GAGAL] Lihat pesan error di atas. Pastikan internet aktif lalu coba lagi.
pause
exit /b 1
