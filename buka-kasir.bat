@echo off
REM ==============================================================================
REM Ulilmart POS - Buka Kasir Mandiri (Windows)
REM Shortcut cepat membuka aplikasi kasir dengan jendela desktop mandiri
REM ==============================================================================
chcp 65001 >nul 2>&1
cd /d "%~dp0"

if exist "%~dp0desktop.bat" (
    call "%~dp0desktop.bat"
) else if exist "%~dp0run.bat" (
    call "%~dp0run.bat"
) else (
    npm start
)
