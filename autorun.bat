@echo off
rem Ulilmart POS - autorun.bat
rem   (tanpa argumen)     jalankan kasir, sama dengan MULAI-KASIR.bat
rem   --startup           jalankan kasir otomatis saat Windows menyala
rem   --remove-startup    matikan auto-start
rem   --shortcut          buat shortcut di Desktop
rem   --menu              tampilkan pilihan di atas
cd /d "%~dp0"
if /i "%~1"=="--startup" goto STARTUP
if /i "%~1"=="--install-startup" goto STARTUP
if /i "%~1"=="--remove-startup" goto REMOVE
if /i "%~1"=="--shortcut" goto SHORTCUT
if /i "%~1"=="--menu" goto MENU
if /i "%~1"=="--setup" goto MENU
call MULAI-KASIR.bat
exit /b

:MENU
echo [1] Aktifkan auto-start   [2] Matikan auto-start   [3] Shortcut Desktop   [4] Jalankan kasir
choice /c 1234 /n /m "Pilih 1-4: "
if errorlevel 4 (call MULAI-KASIR.bat & exit /b)
if errorlevel 3 goto SHORTCUT
if errorlevel 2 goto REMOVE
goto STARTUP

:STARTUP
call scripts\buat-shortcut.bat Startup
echo Auto-start aktif. Kasir akan terbuka setiap kali Windows menyala.
pause
exit /b 0

:REMOVE
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Ulilmart POS.lnk" 2>nul
echo Auto-start dimatikan.
pause
exit /b 0

:SHORTCUT
call BUAT-SHORTCUT-DESKTOP.bat
exit /b 0
