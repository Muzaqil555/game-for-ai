@echo off
chcp 65001 >nul
title AI Studio Arcade - Launcher
cd /d "%~dp0"
cls
echo ======================================================================
echo      AI STUDIO ARCADE: Aetheria, Apex Pursuit 3D, Void Nova
echo                           Oyun Başladıcı
echo ======================================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js aşkar edildi. Lokal oyun serveri başladılır...
    REM server.js picks the next free port if 8080 is busy and opens the browser itself.
    start "AI Studio Arcade Server" /min node "%~dp0server.js" --open
    goto :done
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python aşkar edildi. Lokal HTTP server port 8080-də başladılır...
    start "AI Studio Arcade Server" /min cmd /c "cd /d "%~dp0" && python -m http.server 8080 --bind 127.0.0.1"
    timeout /t 2 /nobreak >nul
    echo [INFO] Brauzer açılır: http://localhost:8080/index.html
    start "" "http://localhost:8080/index.html"
    goto :done
)

echo [INFO] Oyun birbaşa brauzerdə açılır...
start "" "%~dp0index.html"

:done
echo.
echo ======================================================================
echo Oyun başladıldı. Serveri bağlamaq üçün "AI Studio Arcade Server" pəncərəsini bağlayın.
echo ======================================================================
timeout /t 3 >nul
