@echo off
rem Helper: buat shortcut "Ulilmart POS" ke MULAI-KASIR.bat.
rem Pakai:  call scripts\buat-shortcut.bat Desktop   atau   ... Startup
for %%R in ("%~dp0..") do set "ROOT=%%~fR\"
powershell -NoProfile -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('%~1') + '\Ulilmart POS.lnk'); $s.TargetPath = '%ROOT%MULAI-KASIR.bat'; $s.WorkingDirectory = '%ROOT%'; $s.IconLocation = '%ROOT%ulilmart.ico'; $s.Save()"
