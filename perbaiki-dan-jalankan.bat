@echo off
rem Matikan server yang macet di port 3000, lalu jalankan kasir lagi.
cd /d "%~dp0"
call BERHENTI-KASIR.bat
call MULAI-KASIR.bat
