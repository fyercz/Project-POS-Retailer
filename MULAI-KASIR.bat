@echo off
setlocal
title Ulilmart POS - Memulai Kasir
cd /d "%~dp0"
set "PORT=3000"
set "URL=http://localhost:%PORT%"

echo ==============================================
echo   ULILMART POS - Memulai kasir, mohon tunggu...
echo ==============================================
echo.

rem --- 1. Cari Node.js ---
where node >nul 2>nul
if not errorlevel 1 goto NODE_OK
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
where node >nul 2>nul
if not errorlevel 1 goto NODE_OK
echo [GAGAL] Node.js belum terpasang.
echo Unduh dan pasang Node.js LTS dari https://nodejs.org lalu jalankan file ini lagi.
start "" https://nodejs.org/en/download
pause
exit /b 1
:NODE_OK

rem --- 2. Siapkan file .env ---
if not exist ".env" if exist ".env.example" copy ".env.example" ".env" >nul

rem --- 3. Jika server sudah jalan, langsung buka kasir ---
call :CEK_PORT
if not errorlevel 1 goto BUKA

rem --- 4. Instal dependensi (hanya pertama kali) ---
if exist "node_modules\express" goto SUDAH_INSTAL
echo [1/2] Memasang komponen kasir (pertama kali saja, perlu internet, 1-3 menit)...
call npm install --no-audit --no-fund
if errorlevel 1 goto GAGAL_INSTAL
:SUDAH_INSTAL

rem --- 5. Build (hanya jika belum ada) ---
if exist "dist\server.cjs" goto SUDAH_BUILD
echo [2/2] Menyiapkan aplikasi kasir (pertama kali saja)...
call npm run build
if errorlevel 1 goto GAGAL_BUILD
:SUDAH_BUILD

rem --- 6. Jalankan server di latar belakang (jendela kecil, log di server.log) ---
echo Menyalakan server kasir...
start "UlilmartPOS-Server" /min cmd /c "node dist\server.cjs >> server.log 2>&1"

rem --- 7. Tunggu server siap (maks 60 detik) ---
set /a TRIES=0
:TUNGGU
call :CEK_PORT
if not errorlevel 1 goto BUKA
set /a TRIES+=1
if %TRIES% geq 60 goto GAGAL_SERVER
timeout /t 1 /nobreak >nul
goto TUNGGU

:BUKA
echo Membuka kasir...
set "BROWSER="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if defined BROWSER (
    start "" "%BROWSER%" --app=%URL%
) else (
    start "" %URL%
)
exit /b 0

:CEK_PORT
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient('127.0.0.1', %PORT%); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>nul
exit /b %errorlevel%

:GAGAL_INSTAL
echo.
echo [GAGAL] Pemasangan komponen gagal. Pastikan internet aktif lalu coba lagi.
pause
exit /b 1

:GAGAL_BUILD
echo.
echo [GAGAL] Penyiapan aplikasi gagal. Kirim tulisan error di atas untuk dicek.
pause
exit /b 1

:GAGAL_SERVER
echo.
echo [GAGAL] Server kasir tidak merespons. Lihat file server.log di folder ini.
echo Kemungkinan port %PORT% dipakai program lain. Coba jalankan BERHENTI-KASIR.bat lalu ulangi.
if exist server.log type server.log
pause
exit /b 1
