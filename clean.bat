@echo off
rem Bersihkan log, file temp, dan cache. Database kasir TIDAK dihapus.
rem Pilihan:  --dry-run (lihat saja)   --dist (ikut hapus folder dist)
cd /d "%~dp0"
call scripts\cari-node.bat
if errorlevel 1 (echo [GAGAL] Node.js belum terpasang. & pause & exit /b 1)
node scripts\cleaner.mjs %*
pause
