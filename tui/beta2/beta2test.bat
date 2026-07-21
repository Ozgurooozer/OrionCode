@echo off
chcp 65001 > nul
title Orion Beta2 TUI Test
echo.
echo   Orion Beta2 --- TUI Visual Test
echo   ================================
echo.
echo   [*] Beta2 TUI baslatiliyor...
echo.
cd /d "%~dp0..\.."
node --experimental-strip-types tui/beta2/beta2-test.ts
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo   [X] HATA: Test basarisiz oldu (exit code: %ERRORLEVEL%)
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo   [OK] Test tamamlandi.
pause > nul
