@echo off
rem ==========================================================================
rem  Ulilmart POS - Hapus aplikasi (uninstall)
rem  1. Matikan server kasir      2. Cadangkan data toko ke Desktop (opsional)
rem  3. Hapus shortcut & auto-start   4. Hapus folder aplikasi
rem  Data di browser dan Node.js TIDAK dihapus (lihat pesan di akhir).
rem ==========================================================================
rem Skrip berpindah ke salinan di folder TEMP (tanpa "call", tidak kembali lagi),
rem karena file ini berada di dalam folder yang akan dihapus.
if not "%~1"=="--dari-temp" (
    copy /y "%~f0" "%TEMP%\ulilmart-hapus.bat" >nul
    "%TEMP%\ulilmart-hapus.bat" --dari-temp "%~dp0"
)
setlocal
title Ulilmart POS - Hapus Aplikasi
set "APP=%~2"
if "%APP:~-1%"=="\" set "APP=%APP:~0,-1%"
cd /d "%TEMP%"

rem Pengaman: pastikan ini benar folder Ulilmart POS
if not exist "%APP%\package.json" goto BUKAN_FOLDER
if not exist "%APP%\MULAI-KASIR.bat" goto BUKAN_FOLDER
if "%APP:~3%"=="" goto BUKAN_FOLDER

echo ==============================================================
echo   HAPUS APLIKASI ULILMART POS
echo ==============================================================
echo   Folder yang akan dihapus:
echo   %APP%
echo.
choice /c YT /m "Yakin ingin menghapus aplikasi kasir dari komputer ini"
if errorlevel 2 goto BATAL

echo.
rem Lokasi Desktop (juga bila dipindah ke OneDrive)
powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')" > "%TEMP%\ulilmart-desktop.txt"
set /p DESKTOP=<"%TEMP%\ulilmart-desktop.txt"
del /q "%TEMP%\ulilmart-desktop.txt" 2>nul
if not defined DESKTOP set "DESKTOP=%USERPROFILE%\Desktop"

echo [1/4] Mematikan server kasir...
taskkill /f /im UlilmartPOS.exe >nul 2>nul
taskkill /f /im UlilmartPOS-Kiosk.exe >nul 2>nul
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak >nul

echo [2/4] Cadangan data toko...
if not exist "%APP%\data" if not exist "%APP%\data-backup" (
    echo       Tidak ada folder data, lewati.
    goto SHORTCUT
)
choice /c YT /m "Simpan cadangan data toko (produk, transaksi, member) ke Desktop dulu? Sangat disarankan"
if errorlevel 2 goto SHORTCUT
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%t"
set "BK=%DESKTOP%\Ulilmart-Backup-%STAMP%"
if exist "%APP%\data" (
    robocopy "%APP%\data" "%BK%\data" /E /NFL /NDL /NJH /NJS /NP >nul
    if errorlevel 8 goto BACKUP_GAGAL
)
if exist "%APP%\data-backup" (
    robocopy "%APP%\data-backup" "%BK%\data-backup" /E /NFL /NDL /NJH /NJS /NP >nul
    if errorlevel 8 goto BACKUP_GAGAL
)
if exist "%APP%\.env" copy /y "%APP%\.env" "%BK%\.env" >nul
echo       Cadangan tersimpan di: %BK%

:SHORTCUT
echo [3/4] Menghapus shortcut dan auto-start...
del /f /q "%DESKTOP%\Ulilmart POS.lnk" 2>nul
del /f /q "%DESKTOP%\Ulilmart POS Kasir.lnk" 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ulilmart POS.lnk" 2>nul

echo [4/4] Menghapus folder aplikasi, mohon tunggu...
rd /s /q "%APP%" 2>nul
if exist "%APP%" (
    timeout /t 3 /nobreak >nul
    rd /s /q "%APP%" 2>nul
)
if exist "%APP%" goto MASIH_ADA

echo.
echo ==============================================================
echo   Aplikasi Ulilmart POS sudah dihapus.
echo ==============================================================
goto SISA

:MASIH_ADA
echo.
echo [PERINGATAN] Sebagian file tidak bisa dihapus karena masih dipakai program lain.
echo Tutup jendela kasir / browser, restart komputer, lalu hapus folder ini secara manual:
echo   %APP%

:SISA
echo.
echo Yang masih perlu dihapus MANUAL bila diinginkan:
echo  - Data kasir di browser: buka edge://settings/siteData atau
echo    chrome://settings/content/all, cari "localhost", lalu hapus.
echo  - Aplikasi PWA, bila pernah dipasang: edge://apps atau chrome://apps.
echo  - Node.js, bila tidak dipakai program lain: Settings - Apps - Node.js - Uninstall.
echo  - Data di HP / kasir lain: hapus data situs alamat server di browser masing-masing.
echo.
pause
exit /b 0

:BACKUP_GAGAL
echo.
echo [GAGAL] Data toko tidak bisa dicadangkan. Penghapusan DIBATALKAN agar data aman.
echo Silakan salin folder ini secara manual: %APP%\data
pause
exit /b 1

:BUKAN_FOLDER
echo [GAGAL] Folder aplikasi Ulilmart POS tidak dikenali: %APP%
echo Penghapusan dibatalkan demi keamanan.
pause
exit /b 1

:BATAL
echo Dibatalkan. Tidak ada yang dihapus.
pause
exit /b 0
