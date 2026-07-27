@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo ============================================================
echo  TAYF Multi-Agent Terminal Baslatici
echo  Ctrl+C ile kapat
echo ============================================================
echo.

where python > nul 2>&1
if errorlevel 1 (
    echo HATA: python bulunamadi.
    pause
    exit /b 1
)

if not exist ".tayf" mkdir ".tayf"
if not exist ".tayf\kanal.jsonl" type nul > ".tayf\kanal.jsonl"

set AJAN_SAYISI=2
if not "%1"=="" set AJAN_SAYISI=%1

echo %AJAN_SAYISI% ajan baslatiliyor...
python tayf_baslat.py --ajan %AJAN_SAYISI%

echo.
pause
