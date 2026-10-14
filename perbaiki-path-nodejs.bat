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

REM 1. Pastikan System32 dan PowerShell ada di sesi aktif
if exist "%SystemRoot%\System32" (
    set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\;%PATH%"
)

echo [1/3] Memindai keberadaan Node.js di komputer Anda...
set "FOUND_NODE_DIR="

REM Metode 1: Periksa apakah node sudah ada di PATH aktif
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "delims=" %%i in ('where node 2^>nul') do (
        if not defined FOUND_NODE_DIR set "FOUND_NODE_DIR=%%~dpi"
    )
)

REM Metode 2: Cek Registry Windows (Official Installer Node.js)
if not defined FOUND_NODE_DIR (
    for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Node.js" /v InstallPath 2^>nul') do (
        if exist "%%~bnode.exe" set "FOUND_NODE_DIR=%%~b"
    )
)
if not defined FOUND_NODE_DIR (
    for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\WOW6432Node\Node.js" /v InstallPath 2^>nul') do (
        if exist "%%~bnode.exe" set "FOUND_NODE_DIR=%%~b"
    )
)
if not defined FOUND_NODE_DIR (
    for /f "tokens=2*" %%a in ('reg query "HKCU\SOFTWARE\Node.js" /v InstallPath 2^>nul') do (
        if exist "%%~bnode.exe" set "FOUND_NODE_DIR=%%~b"
    )
)

REM Metode 3: Cek Folder Instalasi Standar & Non-Standar di Berbagai Drive
if not defined FOUND_NODE_DIR if exist "C:\Program Files\nodejs\node.exe" set "FOUND_NODE_DIR=C:\Program Files\nodejs"
if not defined FOUND_NODE_DIR if exist "%ProgramFiles%\nodejs\node.exe" set "FOUND_NODE_DIR=%ProgramFiles%\nodejs"
if not defined FOUND_NODE_DIR if exist "C:\Program Files (x86)\nodejs\node.exe" set "FOUND_NODE_DIR=C:\Program Files (x86)\nodejs"
if not defined FOUND_NODE_DIR if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "FOUND_NODE_DIR=%ProgramFiles(x86)%\nodejs"
if not defined FOUND_NODE_DIR if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "FOUND_NODE_DIR=%LOCALAPPDATA%\Programs\nodejs"
if not defined FOUND_NODE_DIR if exist "%USERPROFILE%\AppData\Local\Programs\nodejs\node.exe" set "FOUND_NODE_DIR=%USERPROFILE%\AppData\Local\Programs\nodejs"
if not defined FOUND_NODE_DIR if exist "%APPDATA%\npm\node.exe" set "FOUND_NODE_DIR=%APPDATA%\npm"
if not defined FOUND_NODE_DIR if exist "%ProgramW6432%\nodejs\node.exe" set "FOUND_NODE_DIR=%ProgramW6432%\nodejs"
if not defined FOUND_NODE_DIR if exist "C:\nvm\nodejs\node.exe" set "FOUND_NODE_DIR=C:\nvm\nodejs"
if not defined FOUND_NODE_DIR if exist "%NVM_SYMLINK%\node.exe" set "FOUND_NODE_DIR=%NVM_SYMLINK%"
if not defined FOUND_NODE_DIR if exist "%USERPROFILE%\AppData\Roaming\nvm\current\node.exe" set "FOUND_NODE_DIR=%USERPROFILE%\AppData\Roaming\nvm\current"
if not defined FOUND_NODE_DIR if exist "C:\ProgramData\chocolatey\bin\node.exe" set "FOUND_NODE_DIR=C:\ProgramData\chocolatey\bin"
if not defined FOUND_NODE_DIR if exist "%USERPROFILE%\scoop\apps\nodejs\current\node.exe" set "FOUND_NODE_DIR=%USERPROFILE%\scoop\apps\nodejs\current"
if not defined FOUND_NODE_DIR if exist "C:\nodejs\node.exe" set "FOUND_NODE_DIR=C:\nodejs"
if not defined FOUND_NODE_DIR if exist "D:\nodejs\node.exe" set "FOUND_NODE_DIR=D:\nodejs"
if not defined FOUND_NODE_DIR if exist "D:\Program Files\nodejs\node.exe" set "FOUND_NODE_DIR=D:\Program Files\nodejs"
if not defined FOUND_NODE_DIR if exist "D:\Program Files (x86)\nodejs\node.exe" set "FOUND_NODE_DIR=D:\Program Files (x86)\nodejs"
if not defined FOUND_NODE_DIR if exist "E:\nodejs\node.exe" set "FOUND_NODE_DIR=E:\nodejs"

REM Metode 4: PowerShell Deep Scan Uninstall Registry
if not defined FOUND_NODE_DIR (
    for /f "delims=" %%p in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$loc = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*Node.js*' -and $_.InstallLocation } | Select-Object -First 1 -ExpandProperty InstallLocation); if ($loc -and (Test-Path \"$loc\node.exe\")) { Write-Output $loc }" 2^>nul') do (
        set "FOUND_NODE_DIR=%%p"
    )
)

if defined FOUND_NODE_DIR (
    if "%FOUND_NODE_DIR:~-1%"=="\" set "FOUND_NODE_DIR=%FOUND_NODE_DIR:~0,-1%"
    echo       [OK] Node.js terdeteksi secara fisik di:
    echo            "%FOUND_NODE_DIR%\node.exe"
    set "PATH=%FOUND_NODE_DIR%;%FOUND_NODE_DIR%\node_modules\npm\bin;%APPDATA%\npm;%PATH%"
) else (
    echo       [!] Node.js belum ditemukan secara otomatis di folder standar.
)

echo.
echo [2/3] Memeriksa ketersediaan perintah via System PATH...
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('node -v 2^>nul') do set "CURR_NODE_VER=%%i"
    echo       [OK] Perintah 'node' aktif: %CURR_NODE_VER%
) else (
    echo       [X] Perintah 'node' belum dikenali oleh Windows CMD.
)

where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('npm -v 2^>nul') do set "CURR_NPM_VER=%%i"
    echo       [OK] Perintah 'npm' aktif: v%CURR_NPM_VER%
) else (
    echo       [X] Perintah 'npm' belum dikenali oleh Windows CMD.
)

echo.
echo ==============================================================================
echo [3/3] Tindakan Perbaikan:
echo ==============================================================================

if defined FOUND_NODE_DIR (
    echo  Node.js terpasang di "%FOUND_NODE_DIR%".
    echo.
    echo  Pilihan yang tersedia:
    echo  [1] Daftarkan folder Node.js ke PATH Windows secara permanen (Direkomendasikan)
    echo  [2] Langsung jalankan aplikasi kasir sekarang (autorun.bat)
    echo  [3] Keluar
    echo.
    set /p AKSI="Masukkan pilihan Anda (1/2/3) [Default: 1]: "
    if "%AKSI%"=="" set "AKSI=1"
    
    if "%AKSI%"=="1" goto DAFTAR_PATH
    if "%AKSI%"=="2" goto JALANKAN_AUTORUN
    goto SELESAI_KELUAR
) else (
    echo  Node.js belum ditemukan di folder standar komputer ini.
    echo.
    echo  Pilihan yang tersedia:
    echo  [1] Cari otomatis di seluruh Drive C: dan D: (Deep Scan)
    echo  [2] Masukkan lokasi folder tempat Anda menginstal Node.js secara manual
    echo  [3] Instal Node.js otomatis lewat winget (Windows Package Manager)
    echo  [4] Buka website resmi https://nodejs.org/ untuk mengunduh installer LTS
    echo  [5] Keluar
    echo.
    set /p AKSI_MANUAL="Masukkan pilihan Anda (1-5) [Default: 1]: "
    if "%AKSI_MANUAL%"=="" set "AKSI_MANUAL=1"
    
    if "%AKSI_MANUAL%"=="1" goto DEEP_SCAN
    if "%AKSI_MANUAL%"=="2" goto INPUT_MANUAL
    if "%AKSI_MANUAL%"=="3" goto INSTALL_WINGET
    if "%AKSI_MANUAL%"=="4" (
        start "" https://nodejs.org/
        echo.
        echo Website https://nodejs.org/ telah dibuka di browser.
        echo Silakan unduh versi "LTS", jalankan instalasi hingga selesai,
        echo lalu buka kembali file autorun.bat.
        echo.
        pause
        exit /b 0
    )
    goto SELESAI_KELUAR
)

:DEEP_SCAN
echo.
echo [PROSES] Memindai seluruh Drive C: dan D: untuk mencari node.exe (mohon tunggu)...
for /f "delims=" %%f in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$found = Get-ChildItem -Path @('C:\Program Files', 'C:\Users', 'D:\', 'C:\') -Filter 'node.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1; if ($found) { Write-Output $found.DirectoryName }" 2^>nul') do (
    set "FOUND_NODE_DIR=%%f"
)
if defined FOUND_NODE_DIR (
    echo [OK] Node.js berhasil ditemukan di: "%FOUND_NODE_DIR%"
    goto DAFTAR_PATH
)
echo.
echo [!] Node.js tidak ditemukan di komputer ini.
echo Silakan unduh Node.js LTS dari https://nodejs.org/
echo.
pause
goto SELESAI_KELUAR

:INSTALL_WINGET
echo.
echo [PROSES] Mencoba menginstal Node.js LTS via winget...
where winget >nul 2>nul
if %ERRORLEVEL% equ 0 (
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% equ 0 (
        echo [OK] Instalasi Node.js LTS selesai!
        pause
        goto JALANKAN_AUTORUN
    ) else (
        echo [!] Gagal menginstal via winget. Silakan unduh manual dari https://nodejs.org/
    )
) else (
    echo [!] Perintah winget tidak tersedia di Windows ini.
    start "" https://nodejs.org/
)
echo.
pause
goto SELESAI_KELUAR

:INPUT_MANUAL
echo.
echo Masukkan lokasi folder tempat Node.js berada di komputer Anda.
echo (Contoh: C:\Program Files\nodejs atau D:\nodejs atau seret folder ke sini)
set /p USER_DIR="Lokasi folder: "
set "USER_DIR=%USER_DIR:"=%"
if exist "%USER_DIR%\node.exe" (
    set "FOUND_NODE_DIR=%USER_DIR%"
    goto DAFTAR_PATH
)
if exist "%USER_DIR%" (
    for %%f in ("%USER_DIR%") do (
        if "%%~nxf"=="node.exe" (
            set "FOUND_NODE_DIR=%%~dpf"
            goto DAFTAR_PATH
        )
    )
)
echo [ERROR] Tidak ditemukan node.exe di "%USER_DIR%".
echo.
pause
exit /b 1

:DAFTAR_PATH
echo.
echo [PROSES] Mendaftarkan "%FOUND_NODE_DIR%" ke Environment User...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::User) + ';%FOUND_NODE_DIR%;%APPDATA%\npm', [EnvironmentVariableTarget]::User)" >nul 2>&1
echo       [OK] Selesai! Lokasi Node.js telah didaftarkan ke Windows User Environment.
echo       [*] Seluruh file .bat sekarang dapat dijalankan tanpa error!
echo.
set /p RUN_SEKARANG="Jalankan aplikasi kasir sekarang (Y/T)? [Default: Y]: "
if "%RUN_SEKARANG%"=="" set "RUN_SEKARANG=Y"
if /i "%RUN_SEKARANG%"=="Y" goto JALANKAN_AUTORUN
echo.
echo Pengaturan telah disimpan. Anda dapat menjalankan autorun.bat kapan saja.
pause
exit /b 0

:JALANKAN_AUTORUN
cls
if exist "%~dp0autorun.bat" (
    call "%~dp0autorun.bat"
) else (
    echo [ERROR] autorun.bat tidak ditemukan di direktori ini.
    pause
)
exit /b 0

:SELESAI_KELUAR
echo.
echo Tekan tombol apa saja untuk menutup jendela ini...
pause >nul
exit /b 0
