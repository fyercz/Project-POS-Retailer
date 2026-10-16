@echo off
rem Helper: pastikan node.exe ada di PATH sesi ini. errorlevel 0 = ketemu, 1 = tidak ada.
rem Dipanggil dari skrip lain:  call scripts\cari-node.bat
where node >nul 2>nul && exit /b 0
for %%D in ("%ProgramFiles%\nodejs" "%ProgramFiles(x86)%\nodejs" "%LOCALAPPDATA%\Programs\nodejs" "%NVM_SYMLINK%" "%APPDATA%\nvm\current" "C:\nodejs" "D:\nodejs") do (
    if exist "%%~D\node.exe" (
        set "PATH=%%~D;%APPDATA%\npm;%PATH%"
        exit /b 0
    )
)
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Node.js" /v InstallPath 2^>nul') do (
    if exist "%%~bnode.exe" (
        set "PATH=%%~b;%APPDATA%\npm;%PATH%"
        exit /b 0
    )
)
exit /b 1
