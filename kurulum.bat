@echo off
chcp 65001 >nul
title 3D T-Shirt Studio - Kurulum ve Derleme
cd /d "%~dp0"

echo ========================================================
echo   3D T-Shirt Studio - Kurulum ve Üretim Derlemesi
echo ========================================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [HATA] Node.js bulunamadi. Lutfen https://nodejs.org adresinden yukleyin.
    pause
    exit /b 1
)

echo [1/2] Bagimliliklar yukleniyor (npm install)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [HATA] npm install basarisiz oldu.
    pause
    exit /b 1
)

echo.
echo [2/2] PromptVault eklentisi ve statik paket derleniyor (npm run build)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [HATA] Derleme sirasinda hata olustu.
    pause
    exit /b 1
)

echo.
echo [TAMAMLANDI] Kurulum basariyla tamamlandi!
echo Uygulamayi baslatmak icin "baslat.bat" dosyasina cift tiklayabilirsiniz.
pause
