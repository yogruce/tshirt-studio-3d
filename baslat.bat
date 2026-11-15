@echo off
chcp 65001 >nul
title 3D T-Shirt Studio & 2D Kalip Editoru
cd /d "%~dp0"

echo ========================================================
echo   3D T-Shirt Studio ^& 2D Kalip Editoru Baslatiliyor...
echo ========================================================
echo.

:: Node.js kontrolu
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] Bilgisayarinizda Node.js kurulu degil!
    echo Lutfen https://nodejs.org adresinden Node.js LTS surumunu kurun.
    pause
    exit /b 1
)

:: node_modules yoksa otomatik kur
if not exist "node_modules\" (
    echo [KURULUM] Ilk calistirma: Paketler yukleniyor ^(npm install^)...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [HATA] Paket kurulumu sirasinda bir sorun olustu.
        pause
        exit /b 1
    )
)

:: 5173 portunu mesgul eden eski surec varsa kapat
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo Sunucu adresi: http://localhost:5173
echo Tarayici aciliyor...
echo.

start "" "http://localhost:5173"
call npm run dev
