@echo off
chcp 65001 >nul
title 3D T-Shirt Studio - GitHub Guncelleme
cd /d "%~dp0"

echo ========================================================
echo   GitHub uzerinden en son guncellemeler aliniyor...
echo ========================================================
echo.

git pull origin main
call npm install
call npm run build

echo.
echo [TAMAMLANDI] Uygulama en guncel surume yukseltildi!
pause
