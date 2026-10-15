@echo off
cd /d "%~dp0"
powershell -NoProfile -Command "$w = New-Object -ComObject WScript.Shell; $s = $w.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Ulilmart POS.lnk'); $s.TargetPath = '%~dp0MULAI-KASIR.bat'; $s.WorkingDirectory = '%~dp0'; if (Test-Path '%~dp0ulilmart.ico') { $s.IconLocation = '%~dp0ulilmart.ico' }; $s.Save()"
echo Shortcut "Ulilmart POS" sudah dibuat di Desktop.
pause
