@echo off
chcp 65001 >nul
title AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ V2.0 - Launcher
cd /d "%~dp0"
cls
echo ======================================================================
echo      AETHERIA: KÖLGƏLƏRİN SƏLTƏNƏTİ V2.0 (26-Agent Mega-Edition)
echo                           Oyun Başladıcı
echo ======================================================================
echo.

REM Port 8080-də ilişib qalmış köhnə proses varsa təmizlə
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
)

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js aşkar edildi. Sürətli oyun serveri port 8080-də başladılır...
    start "Aetheria V2.0 Game Server" /min node "%~dp0server.js"
    timeout /t 1 /nobreak >nul
    echo [INFO] Brauzer açılır: http://localhost:8080/index.html
    start "" "http://localhost:8080/index.html"
    goto :done
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python aşkar edildi. Lokal HTTP server port 8080-də başladılır...
    start "Aetheria V2.0 Game Server" /min cmd /c "cd /d "%~dp0" && python -m http.server 8080"
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
echo Oyun uğurla başladıldı! (http://localhost:8080/index.html)
echo ======================================================================
timeout /t 3 >nul
