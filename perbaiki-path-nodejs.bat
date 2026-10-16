@echo off
rem Cari Node.js yang sudah terpasang dan daftarkan ke PATH pengguna secara permanen.
setlocal
title Ulilmart POS - Perbaiki PATH Node.js
cd /d "%~dp0"
call scripts\cari-node.bat
if errorlevel 1 goto TIDAK_ADA

for /f "delims=" %%i in ('where node') do (
    set "NODE_DIR=%%~dpi"
    goto KETEMU
)
:KETEMU
set "NODE_DIR=%NODE_DIR:~0,-1%"
echo Node.js ditemukan di: %NODE_DIR%
powershell -NoProfile -Command "$p = [string][Environment]::GetEnvironmentVariable('Path','User'); $d = '%NODE_DIR%'; if (($p -split ';') -contains $d) { 'PATH sudah benar.' } else { [Environment]::SetEnvironmentVariable('Path', (($p.TrimEnd(';') + ';' + $d).TrimStart(';')), 'User'); 'PATH berhasil diperbarui.' }"
choice /c YT /m "Jalankan kasir sekarang"
if errorlevel 2 exit /b 0
call MULAI-KASIR.bat
exit /b 0

:TIDAK_ADA
echo Node.js tidak ditemukan di komputer ini.
choice /c YT /m "Pasang Node.js sekarang"
if errorlevel 2 exit /b 1
call pasang-nodejs.bat
