@echo off
title Ulilmart POS - Hentikan Kasir
echo Menghentikan server kasir...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo Selesai. Data toko tetap aman.
timeout /t 2 /nobreak >nul
